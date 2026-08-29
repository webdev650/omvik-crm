export interface ProjectLike {
  _id: string;
  name: string;
  code?: string;
  parentProject?: { _id?: string; name: string; code?: string } | string | null;
  subProjects?: ProjectLike[];
}

/**
 * Returns formatted display label for a project (e.g., "Omvik Heights > Tower A" or "Omvik Heights")
 */
export function formatProjectName(p: ProjectLike | null | undefined): string {
  if (!p) return '';
  if (p.parentProject) {
    const parentName = typeof p.parentProject === 'object' ? p.parentProject.name : p.parentProject;
    if (parentName) {
      return `${parentName} > ${p.name}`;
    }
  }
  return p.name;
}
