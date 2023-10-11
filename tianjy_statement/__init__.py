
__version__ = '0.0.1'

whitelisted = dict()

def whitelist(*, example = None, desc = None, **argv):
	"""
	Use as:
		@tianjy_statement.whitelist()
		def myfunc(statement, ctx, meta=None, **args):
			pass
	"""
	def inner(fn):
		global whitelisted
		method = None
		if hasattr(fn, "__func__"):
			method = fn
			fn = method.__func__
		whitelisted[fn] = dict(example=example, desc = desc);
		return method or fn
	return inner
