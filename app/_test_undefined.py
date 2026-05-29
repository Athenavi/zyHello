"""Test ChainableUndefined behavior."""
import jinja2

u = jinja2.ChainableUndefined(name="test")
try:
    print("str:", repr(str(u)))
except Exception as e:
    print("str FAILED:", e)
try:
    print("html:", repr(u.__html__()))
except Exception as e:
    print("html FAILED:", e)
try:
    print("bool:", bool(u))
except Exception as e:
    print("bool FAILED:", e)
try:
    print("attr:", repr(str(u.foo)))
except Exception as e:
    print("attr FAILED:", e)
try:
    print("concat:", repr("/" + u + "/"))
except Exception as e:
    print("concat FAILED:", e)
try:
    from markupsafe import escape
    print("escape:", repr(escape(u)))
except Exception as e:
    print("escape FAILED:", e)
try:
    print("call:", repr(u()))
except Exception as e:
    print("call FAILED:", e)
