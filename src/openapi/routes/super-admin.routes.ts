import { createRoute } from '@hono/zod-openapi';
import {
	CreatedFirmResponseSchema,
	CreatedUserResponseSchema,
	CreateFirmBodySchema,
	CreateUserBodySchema,
	FirmIdParamSchema,
	FirmResponseSchema,
	FirmsResponseSchema,
	MessageSchema,
	UsersResponseSchema,
} from '../schemas.js';

const superAdminSecurity = [{ cookieAuth: [] }];

export const createUserRoute = createRoute({
	method: 'post',
	path: '/superadmin/users',
	tags: ['Super Admin – Users'],
	summary: 'Create user',
	description:
		'Creates a new user and associates them with a firm. The password is hashed before storage. Returns 409 if the e-mail is already registered.',
	security: superAdminSecurity,
	request: {
		body: {
			content: {
				'application/json': {
					schema: CreateUserBodySchema,
				},
			},
			required: true,
			description: 'New user details',
		},
	},
	responses: {
		201: {
			content: { 'application/json': { schema: CreatedUserResponseSchema } },
			description: 'User created successfully',
			headers: {
				Location: {
					description: 'URL of the newly created user',
					schema: { type: 'string' },
				},
			},
		},
		409: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'A user with this e-mail already exists',
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
		403: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Insufficient privileges (superadmin required)',
		},
		422: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Validation error',
		},
	},
});

export const listUsersRoute = createRoute({
	method: 'get',
	path: '/superadmin/users',
	tags: ['Super Admin – Users'],
	summary: 'List all users',
	description:
		'Returns all registered users across all firms. Password fields are omitted from every record.',
	security: superAdminSecurity,
	responses: {
		200: {
			content: { 'application/json': { schema: UsersResponseSchema } },
			description: 'Users retrieved successfully',
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
		403: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Insufficient privileges (superadmin required)',
		},
	},
});

export const listFirmsRoute = createRoute({
	method: 'get',
	path: '/superadmin/firms',
	tags: ['Super Admin – Firms'],
	summary: 'List all firms',
	description:
		'Returns all registered firms. Sensitive credentials such as `diaPassword`, `diaApiKey`, and `diaUsername` are omitted.',
	security: superAdminSecurity,
	responses: {
		200: {
			content: { 'application/json': { schema: FirmsResponseSchema } },
			description: 'Firms retrieved successfully',
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
		403: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Insufficient privileges (superadmin required)',
		},
	},
});

export const getFirmByIdRoute = createRoute({
	method: 'get',
	path: '/superadmin/firm/{id}',
	tags: ['Super Admin – Firms'],
	summary: 'Get firm by ID',
	description: 'Returns a single firm by its numeric ID.',
	security: superAdminSecurity,
	request: {
		params: FirmIdParamSchema,
	},
	responses: {
		200: {
			content: { 'application/json': { schema: FirmResponseSchema } },
			description: 'Firm retrieved successfully',
		},
		404: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Firm not found',
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
		403: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Insufficient privileges (superadmin required)',
		},
	},
});

export const createFirmRoute = createRoute({
	method: 'post',
	path: '/superadmin/firms',
	tags: ['Super Admin – Firms'],
	summary: 'Create firm',
	description:
		'Creates a new firm. Optionally schedules a background product-sync job. The `diaPassword` is AES-256-GCM encrypted before storage.',
	security: superAdminSecurity,
	request: {
		body: {
			content: {
				'application/json': {
					schema: CreateFirmBodySchema,
				},
			},
			required: true,
			description: 'Firm details and optional sync job configuration',
		},
	},
	responses: {
		201: {
			content: { 'application/json': { schema: CreatedFirmResponseSchema } },
			description: 'Firm created successfully',
			headers: {
				Location: {
					description: 'URL of the newly created firm',
					schema: { type: 'string' },
				},
			},
		},
		401: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Not authenticated',
		},
		403: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Insufficient privileges (superadmin required)',
		},
		422: {
			content: { 'application/json': { schema: MessageSchema } },
			description: 'Validation error',
		},
	},
});
