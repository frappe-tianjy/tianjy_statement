
__version__ = '0.0.1'

whitelisted = []

def whitelist():
	"""
	Use as:
		@tianjy_statement.whitelist()
		def myfunc(statement, ctx, meta=None, **args):
			pass
	"""
	def innerfn(fn):
		global whitelisted
		method = None
		if hasattr(fn, "__func__"):
			method = fn
			fn = method.__func__
		whitelisted.append(fn)
		return method or fn
	return innerfn
