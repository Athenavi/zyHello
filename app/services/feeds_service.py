"""Feeds service — dynamic / announcement / schedule posts, comments, likes."""
import json
from datetime import datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Feeds, FeedsComment, FeedsLike, FeedsMention, FeedsStatus, User
from app.utils.commons import maxstr


def _gen_id() -> str:
    """Generate a short unique ID (20 hex chars)."""
    import uuid
    return uuid.uuid4().hex[:20]


def list_feeds(
    db: Session,
    user_id: str,
    feed_type: int = 0,
    scope_filter: str = None,
    page_no: int = 1,
    page_size: int = 40,
    sort: str = "created_desc",
) -> dict:
    """List feeds with filtering, pagination."""
    query = db.query(Feeds).filter(Feeds.is_deleted == False)

    if feed_type == 1:
        # mentioned
        mentioned_ids = db.query(FeedsMention.feeds_id).filter(
            FeedsMention.user_id == user_id).subquery()
        query = query.filter(Feeds.feeds_id.in_(mentioned_ids))
    elif feed_type == 2:
        # commented by me
        commented_ids = db.query(FeedsComment.feeds_id).filter(
            FeedsComment.created_by == user_id).subquery()
        query = query.filter(Feeds.feeds_id.in_(commented_ids))
    elif feed_type == 3:
        # liked by me
        liked_ids = db.query(FeedsLike.source).filter(
            FeedsLike.created_by == user_id).subquery()
        query = query.filter(Feeds.feeds_id.in_(liked_ids))
    elif feed_type == 10:
        query = query.filter(Feeds.created_by == user_id)
    elif feed_type == 11:
        query = query.filter(Feeds.created_by == user_id, Feeds.scope == "SELF")

    # scope filter
    if scope_filter and feed_type not in (11,):
        if scope_filter == "ALL":
            query = query.filter(Feeds.scope.in_(["ALL", user_id]))
        else:
            query = query.filter(Feeds.scope.in_(["ALL", scope_filter, user_id]))

    total = query.count()

    # sort
    if sort == "older":
        query = query.order_by(Feeds.created_on.asc())
    elif sort == "modified":
        query = query.order_by(Feeds.modified_on.desc())
    else:
        query = query.order_by(Feeds.created_on.desc())

    offset = (page_no - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()

    data = []
    for r in rows:
        data.append(_format_feed(db, r, user_id))

    return {"total": total, "data": data}


def get_feed_details(db: Session, feeds_id: str, user_id: str) -> Optional[dict]:
    """Get single feed details."""
    feed = db.query(Feeds).filter(Feeds.feeds_id == feeds_id, Feeds.is_deleted == False).first()
    if not feed:
        return None
    return _format_feed(db, feed, user_id)


def publish_feed(db: Session, user_id: str, data: dict) -> str:
    """Create a new feed or comment."""
    entity = data.get("entity", "Feeds")
    is_comment = entity == "FeedsComment"

    if is_comment:
        c = FeedsComment(
            comment_id=_gen_id(),
            feeds_id=data.get("feedsId"),
            content=data.get("content", ""),
            images=json.dumps(data.get("images", [])) if data.get("images") else None,
            attachments=json.dumps(data.get("attachments", [])) if data.get("attachments") else None,
            created_by=user_id,
        )
        db.add(c)
        db.commit()
        return c.comment_id
    else:
        f = Feeds(
            feeds_id=_gen_id(),
            content=data.get("content", ""),
            images=json.dumps(data.get("images", [])) if data.get("images") else None,
            attachments=json.dumps(data.get("attachments", [])) if data.get("attachments") else None,
            scope=data.get("scope", "ALL"),
            type=data.get("type", 1),
            related_record=data.get("relatedRecord"),
            content_more=json.dumps(data.get("contentMore", {})) if data.get("contentMore") else None,
            created_by=user_id,
        )
        db.add(f)

        # handle mentions
        mentions = data.get("mentions", [])
        for mid in mentions:
            db.add(FeedsMention(mention_id=_gen_id(), feeds_id=f.feeds_id, user_id=mid))

        db.commit()
        return f.feeds_id


def toggle_like(db: Session, source: str, user_id: str) -> bool:
    """Toggle like on a feed. Returns True if liked, False if unliked."""
    existing = db.query(FeedsLike).filter(
        FeedsLike.source == source, FeedsLike.created_by == user_id
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return False
    else:
        db.add(FeedsLike(like_id=_gen_id(), source=source, created_by=user_id))
        db.commit()
        return True


def delete_feed(db: Session, feeds_id: str) -> bool:
    """Soft-delete a feed or hard-delete a comment."""
    feed = db.query(Feeds).filter(Feeds.feeds_id == feeds_id).first()
    if feed:
        feed.is_deleted = True
        db.commit()
        return True
    comment = db.query(FeedsComment).filter(FeedsComment.comment_id == feeds_id).first()
    if comment:
        comment.is_deleted = True
        db.commit()
        return True
    return False


def finish_schedule(db: Session, feeds_id: str, user_id: str) -> Optional[str]:
    """Mark a schedule feed as finished."""
    feed = db.query(Feeds).filter(
        Feeds.feeds_id == feeds_id, Feeds.type == 20
    ).first()
    if not feed:
        return "记录不存在"
    if feed.created_by != user_id:
        return "无操作权限"

    more = json.loads(feed.content_more) if feed.content_more else {}
    more["finishTime"] = datetime.utcnow().isoformat()
    feed.content_more = json.dumps(more)
    db.commit()
    return None


def get_user_top_feeds(user_id: str) -> list[str]:
    """Get user-pinned feed IDs (in-memory store)."""
    return _user_top_feeds.get(user_id, [])


def toggle_feed_top(db: Session, feeds_id: str, user_id: str) -> None:
    """Pin/unpin a feed for a user."""
    lst = _user_top_feeds.setdefault(user_id, [])
    if feeds_id in lst:
        lst.remove(feeds_id)
    else:
        if len(lst) >= 3:
            lst.pop()
        lst.insert(0, feeds_id)


_user_top_feeds: dict[str, list[str]] = {}


def list_comments(
    db: Session, feeds_id: str, page_no: int = 1, page_size: int = 20
) -> dict:
    """List comments for a feed."""
    query = db.query(FeedsComment).filter(
        FeedsComment.feeds_id == feeds_id,
        FeedsComment.is_deleted == False,
    )
    total = query.count()
    if total == 0:
        return {"total": 0, "data": []}

    offset = (page_no - 1) * page_size
    rows = query.order_by(FeedsComment.created_on.desc()).offset(offset).limit(page_size).all()

    data = []
    for r in rows:
        user = db.query(User).filter(User.user_id == r.created_by).first()
        data.append({
            "id": r.comment_id,
            "content": r.content,
            "createdBy": [r.created_by, user.full_name if user else ""],
            "createdOn": r.created_on.strftime("%Y-%m-%d %H:%M") if r.created_on else "",
            "modifiedOn": r.modified_on.strftime("%Y-%m-%d %H:%M") if r.modified_on else "",
        })

    return {"total": total, "data": data}


def get_announcement_read_status(db: Session, feeds_id: str) -> dict:
    """Get read/unread lists for an announcement."""
    read_rows = db.query(FeedsStatus).filter(FeedsStatus.feeds_id == feeds_id).all()
    read_map = {r.created_by: r.created_on for r in read_rows}

    all_users = db.query(User).filter(User.is_active == True, User.is_disabled == False).all()

    read_list = []
    unread_list = []
    for u in all_users:
        if u.user_id in read_map:
            read_list.append([u.user_id, u.full_name, read_map[u.user_id].isoformat()])
        else:
            unread_list.append([u.user_id, u.full_name, None])

    return {"read": read_list, "unread": unread_list}


def _format_feed(db: Session, feed: Feeds, user_id: str) -> dict:
    """Format a feed into API response dict."""
    user = db.query(User).filter(User.user_id == feed.created_by).first()
    num_comments = db.query(FeedsComment).filter(
        FeedsComment.feeds_id == feed.feeds_id, FeedsComment.is_deleted == False
    ).count()
    num_likes = db.query(FeedsLike).filter(FeedsLike.source == feed.feeds_id).count()
    my_like = db.query(FeedsLike).filter(
        FeedsLike.source == feed.feeds_id, FeedsLike.created_by == user_id
    ).first() is not None

    return {
        "id": feed.feeds_id,
        "self": feed.created_by == user_id,
        "createdBy": [feed.created_by, user.full_name if user else ""],
        "createdOn": feed.created_on.strftime("%Y-%m-%d %H:%M") if feed.created_on else "",
        "modifiedOn": feed.modified_on.strftime("%Y-%m-%d %H:%M") if feed.modified_on else "",
        "content": feed.content or "",
        "images": json.loads(feed.images) if feed.images else None,
        "attachments": json.loads(feed.attachments) if feed.attachments else None,
        "scope": feed.scope,
        "type": feed.type,
        "numComments": num_comments,
        "numLike": num_likes,
        "myLike": my_like if num_likes > 0 else False,
        "contentMore": json.loads(feed.content_more) if feed.content_more else None,
        "relatedRecord": feed.related_record,
    }
