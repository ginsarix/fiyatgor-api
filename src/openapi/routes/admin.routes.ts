import { createRoute } from '@hono/zod-openapi';
import {
	CreatedJobResponseSchema,
	FirmResponseSchema,
	JobBodySchema,
	JobResponseSchema,
	MessageSchema,
	ProductsQuerySchema,
	ProductsResponseSchema,
	ServerCodeQuerySchema,
	SyncResponseSchema,
	UpdatedFirmResponseSchema,
	UpdatedJobResponseSchema,
	UpdateFirmBodySchema,
	UpdateUserBodySchema,
	UserResponseSchema,
} from '../schemas.js';

const adminSecurity = [{ cookieAuth: [] }];

export const syncProductsRoute = createRoute({
	method: 'post',
	path: '/admin/products/sync',
	tags: ['Admin – Products'],
	summary: 'Sync products',
	description:
		'Triggers a full product synchronisation from the DIA ERP for the authenticated firm. Requires an active admin session and a valid `serverCode` query parameter.',
	security: adminSecurity,
	request: {
		query: ServerCodeQuerySchema,
	},
	responses: {
		200: {
			content: { 'application/json': { schema: SyncResponseSchema } },
			description: 'Sync completed successfully',
		},
		400: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Missing serverCode query parameter',
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
		403: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm access denied',
		},
		404: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm not found',
		},
	},
});

export const upsertJobRoute = createRoute({
	method: 'post',
	path: '/admin/jobs',
	tags: ['Admin – Jobs'],
	summary: 'Create or update sync job',
	description:
		'Creates a new background sync job for the firm if none exists, or updates the existing one. The job runs product synchronisation on the specified cron schedule.',
	security: adminSecurity,
	request: {
		query: ServerCodeQuerySchema,
		body: {
			content: {
				'application/json': {
					schema: JobBodySchema,
				},
			},
			required: true,
			description: 'Job schedule configuration',
		},
	},
	responses: {
		200: {
			content: { 'application/json': { schema: UpdatedJobResponseSchema } },
			description: 'Existing job updated',
		},
		201: {
			content: { 'application/json': { schema: CreatedJobResponseSchema } },
			description: 'New job created',
		},
		400: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Missing serverCode query parameter',
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
		403: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm access denied',
		},
		404: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm not found',
		},
		422: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Validation error',
		},
	},
});

export const getJobRoute = createRoute({
	method: 'get',
	path: '/admin/jobs',
	tags: ['Admin – Jobs'],
	summary: 'Get sync job',
	description:
		'Returns the background sync job configured for the authenticated firm.',
	security: adminSecurity,
	request: {
		query: ServerCodeQuerySchema,
	},
	responses: {
		200: {
			content: { 'application/json': { schema: JobResponseSchema } },
			description: 'Job retrieved successfully',
		},
		400: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Missing serverCode query parameter',
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
		403: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm access denied',
		},
		404: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'No job found for this firm',
		},
	},
});

export const deleteJobRoute = createRoute({
	method: 'delete',
	path: '/admin/jobs',
	tags: ['Admin – Jobs'],
	summary: 'Delete sync job',
	description:
		'Deletes the background sync job for the authenticated firm and cancels its scheduler.',
	security: adminSecurity,
	request: {
		query: ServerCodeQuerySchema,
	},
	responses: {
		200: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Job deleted successfully',
		},
		400: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Missing serverCode query parameter',
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
		403: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm access denied',
		},
		404: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm not found',
		},
	},
});

export const getAdminProductsRoute = createRoute({
	method: 'get',
	path: '/admin/products',
	tags: ['Admin – Products'],
	summary: 'List products',
	description:
		'Returns a paginated list of products for the authenticated firm. Supports search and sorting.',
	security: adminSecurity,
	request: {
		query: ProductsQuerySchema,
	},
	responses: {
		200: {
			content: { 'application/json': { schema: ProductsResponseSchema } },
			description: 'Products retrieved successfully',
		},
		400: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Missing serverCode query parameter',
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
		403: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm access denied',
		},
		404: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm not found',
		},
		422: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Validation error',
		},
	},
});

export const getAdminFirmRoute = createRoute({
	method: 'get',
	path: '/admin/firm',
	tags: ['Admin – Firm'],
	summary: 'Get firm',
	description:
		'Returns the firm associated with the authenticated user. Sensitive fields such as `diaPassword` are omitted.',
	security: adminSecurity,
	request: {
		query: ServerCodeQuerySchema,
	},
	responses: {
		200: {
			content: { 'application/json': { schema: FirmResponseSchema } },
			description: 'Firm retrieved successfully',
		},
		400: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Missing serverCode query parameter',
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
		403: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm access denied',
		},
		404: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm not found',
		},
	},
});

export const updateAdminFirmRoute = createRoute({
	method: 'patch',
	path: '/admin/firm',
	tags: ['Admin – Firm'],
	summary: 'Update firm',
	description:
		"Partially updates the authenticated firm's details. All fields are optional.",
	security: adminSecurity,
	request: {
		query: ServerCodeQuerySchema,
		body: {
			content: {
				'application/json': {
					schema: UpdateFirmBodySchema,
				},
			},
			required: true,
			description: 'Fields to update on the firm',
		},
	},
	responses: {
		200: {
			content: { 'application/json': { schema: UpdatedFirmResponseSchema } },
			description: 'Firm updated successfully',
		},
		400: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Missing serverCode query parameter',
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
		403: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm access denied',
		},
		404: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm not found',
		},
		422: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Validation error',
		},
	},
});

export const getMeRoute = createRoute({
	method: 'get',
	path: '/admin/me',
	tags: ['Admin – User'],
	summary: 'Get current user',
	description:
		"Returns the authenticated user's profile. The `password` field is omitted.",
	security: adminSecurity,
	responses: {
		200: {
			content: { 'application/json': { schema: UserResponseSchema } },
			description: 'User retrieved successfully',
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
	},
});

export const updateMeRoute = createRoute({
	method: 'patch',
	path: '/admin/me',
	tags: ['Admin – User'],
	summary: 'Update current user',
	description:
		"Partially updates the authenticated user's profile. The `role` field cannot be changed via this endpoint.",
	security: adminSecurity,
	request: {
		body: {
			content: {
				'application/json': {
					schema: UpdateUserBodySchema,
				},
			},
			required: true,
			description: 'Fields to update on the user',
		},
	},
	responses: {
		200: {
			content: { 'application/json': { schema: UserResponseSchema } },
			description: 'User updated successfully',
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
		422: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Validation error',
		},
	},
});
