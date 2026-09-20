import type { ProjectStatus, TaskAuthoring } from '@valandine/shared';
import { HttpError } from '../middleware/error.js';

/**
 * Task domain rules.
 *
 * Tasks have no owner of their own: every permission question is answered by
 * the project they belong to. The parameters are therefore structural - only
 * the project fields each rule actually needs.
 */

type ProjectParties = { clientId: string | null; specialistId: string | null };

/**
 * A finished or cancelled project must keep its task list intact, because the
 * report and the accumulated hours are read from it.
 */
export function assertProjectAcceptsTasks(project: { status: ProjectStatus }): void {
  if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
    throw new HttpError(
      422,
      'PROJECT_CLOSED',
      `A ${project.status} project cannot have its task list changed`,
      { status: project.status },
    );
  }
}

/**
 * Who may write the task list is decided per project when it is created
 * (`taskAuthoring`): either the client hands over a ready list, or the
 * specialist proposes one after winning the work.
 *
 * A null author means the role is not filled yet - for example a published
 * project whose tasks are to be written by a specialist who has not been
 * chosen. Nobody can author tasks then, which is the intended behaviour.
 */
export function assertCanAuthorTasks(
  project: ProjectParties & { taskAuthoring: TaskAuthoring },
  actorId: string,
): void {
  const author = project.taskAuthoring === 'CLIENT' ? project.clientId : project.specialistId;

  if (author === null || author !== actorId) {
    throw new HttpError(
      403,
      'FORBIDDEN',
      `Tasks of this project are authored by the ${project.taskAuthoring === 'CLIENT' ? 'client' : 'specialist'}`,
      { taskAuthoring: project.taskAuthoring },
    );
  }
}

/**
 * Approval only makes sense for tasks the specialist proposed, and only the
 * client can give it.
 *
 * 422 when the project is not in that mode (the request contradicts the data),
 * 403 when the caller is simply not the client.
 */
export function assertCanApproveTasks(
  project: ProjectParties & { taskAuthoring: TaskAuthoring },
  actorId: string,
): void {
  if (project.taskAuthoring !== 'SPECIALIST') {
    throw new HttpError(
      422,
      'APPROVAL_NOT_APPLICABLE',
      'Only tasks authored by the specialist need the approval of the client',
      { taskAuthoring: project.taskAuthoring },
    );
  }

  if (project.clientId === null || project.clientId !== actorId) {
    throw new HttpError(403, 'FORBIDDEN', 'Only the client of the project may approve tasks');
  }
}
