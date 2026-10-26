import 'server-only';
import { cache } from 'react';
import { listFriends } from '@/server/social-service';
import { createAdminClient } from './admin';

/** Friend lists once per request (layout, header and pages all need them). */
export const getFriendLists = cache((userId: string) => listFriends(createAdminClient(), userId));
