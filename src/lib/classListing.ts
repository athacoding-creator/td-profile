export type CurriculumProgram = {
  id: string;
  category?: string | null;
};

/** Kajian berkurikulum are identified by their episode program, not their event type. */
export const isCurriculumProgram = (program: CurriculumProgram) => program.category === "episode";

export const getCurriculumProgramIds = (programs: CurriculumProgram[]) =>
  programs.filter(isCurriculumProgram).map((program) => program.id);

export const isCurriculumEvent = (
  event: { program_id?: string | null },
  curriculumProgramIds: ReadonlySet<string>,
) => Boolean(event.program_id && curriculumProgramIds.has(event.program_id));