import { TeamsPolicy } from './teams.policy';
import { TeamsService } from './teams.service';
import type { TeamsRepository } from './teams.repository';

type ControllerContext = { user: Parameters<typeof TeamsPolicy.assertView>[0]; service: TeamsService; repository: TeamsRepository };

export function listTeams({ user, service }: ControllerContext) { TeamsPolicy.assertView(user); return service.list(); }
export function createTeam({ user, service }: ControllerContext, input: unknown) { TeamsPolicy.assertCreate(user); return service.create(input); }
export async function updateTeam({ user, service, repository }: ControllerContext, id: string, input: unknown) { await TeamsPolicy.assertUpdate(user, repository, id); return service.update(input, id); }
export async function deleteTeam({ user, service, repository }: ControllerContext, id: string) { await TeamsPolicy.assertDelete(user, repository, id); return service.remove(id); }
