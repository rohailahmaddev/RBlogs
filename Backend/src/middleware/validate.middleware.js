import fs from "node:fs";

export const validateSchema = (schema) => {
    return (req, res, next) => {
        // Express 5: req.body is undefined when nothing was sent
        const result = schema.safeParse(req.body ?? {});

        if (!result.success) {
            // multer already saved the avatar to disk before validation ran;
            // delete it so invalid requests don't leave files behind
            if (req.file?.path) fs.unlink(req.file.path, () => {});

            return res.status(400).json({
                success: false,
                // First problem, e.g. "Please provide email"
                message: result.error.issues[0]?.message ?? "Validation failed",
                // Every problem, grouped by field (same shape as before)
                errors: result.error.flatten(),
            });
        }

        req.body = result.data;
        next();
    };
};