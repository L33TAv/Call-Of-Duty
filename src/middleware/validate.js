export function validate(schemas) {
	return (req, res, next) => {
		if (schemas.params) req.validatedParams = schemas.params.parse(req.params);
		if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
		if (schemas.body) req.validatedBody = schemas.body.parse(req.body);
		next();
	};
}
