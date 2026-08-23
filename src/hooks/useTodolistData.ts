import { useCallback, useMemo } from 'react'
import type {
  AcademicTerm,
  NewSubjectDraft,
  NewWorkDraft,
  Subject,
  Work,
} from '../types/todolist'
import { daysUntilDue, isOverdue } from '../utils/workFormatting'
import type { TodolistStore } from './useTodolistStore'

export interface SubjectProgress {
  subject: Subject
  totalWorks: number
  remainingWorks: number
  overdueWorks: number
  completedRatio: number
}

export interface WorkStatusSummary {
  notStarted: number
  inProgress: number
  completed: number
  total: number
}

export interface TodolistData {
  works: Work[]
  subjects: Subject[]
  subjectsById: Map<string, Subject>
  statusSummary: WorkStatusSummary
  overdueCount: number
  upcomingWorks: Work[]
  nextDueWork: Work | undefined
  subjectProgressList: SubjectProgress[]
  addWork: (draft: NewWorkDraft) => Work
  updateWork: (id: string, changes: Partial<Work>) => void
  deleteWork: (id: string) => void
  restoreWork: (work: Work) => void
  addSubject: (draft: NewSubjectDraft) => Subject
  isSubjectNameTakenInTerm: (name: string, term: AcademicTerm) => boolean
}

/** เรียงงานตามความเร่งด่วน: ยังไม่เสร็จก่อน แล้วค่อยเรียงตามกำหนดส่ง */
function compareByUrgency(left: Work, right: Work): number {
  const leftDone = left.status === 'completed' ? 1 : 0
  const rightDone = right.status === 'completed' ? 1 : 0
  if (leftDone !== rightDone) return leftDone - rightDone
  return left.dueDate.localeCompare(right.dueDate)
}

/**
 * มุมมองของข้อมูลตามเทอมที่เลือกอยู่ — คำนวณล้วน ๆ จาก store ไม่ถือ state ของตัวเอง
 * (งานอิงเทอมตามวิชาที่มันสังกัดอยู่)
 */
export function useTodolistData(term: AcademicTerm, store: TodolistStore): TodolistData {
  const { subjects: allSubjects, works: allWorks } = store
  const ownerEmail = store.viewingAs?.email ?? ''

  const subjectsById = useMemo(
    () => new Map(allSubjects.map((subject) => [subject.id, subject])),
    [allSubjects],
  )

  const subjects = useMemo(
    () =>
      allSubjects.filter(
        (subject) =>
          subject.academicYear === term.academicYear && subject.semester === term.semester,
      ),
    [allSubjects, term.academicYear, term.semester],
  )

  const works = useMemo(() => {
    const subjectIdsInTerm = new Set(subjects.map((subject) => subject.id))
    return allWorks.filter((work) => subjectIdsInTerm.has(work.subjectId))
  }, [allWorks, subjects])

  const sortedWorks = useMemo(() => [...works].sort(compareByUrgency), [works])

  const statusSummary = useMemo<WorkStatusSummary>(() => {
    const summary: WorkStatusSummary = {
      notStarted: 0,
      inProgress: 0,
      completed: 0,
      total: works.length,
    }
    for (const work of works) summary[work.status] += 1
    return summary
  }, [works])

  const overdueCount = useMemo(
    () => works.filter((work) => isOverdue(work.dueDate, work.status)).length,
    [works],
  )

  const upcomingWorks = useMemo(
    () => sortedWorks.filter((work) => work.status !== 'completed').slice(0, 5),
    [sortedWorks],
  )

  const nextDueWork = useMemo(
    () =>
      sortedWorks.find(
        (work) => work.status !== 'completed' && daysUntilDue(work.dueDate) >= 0,
      ) ?? upcomingWorks[0],
    [sortedWorks, upcomingWorks],
  )

  const subjectProgressList = useMemo<SubjectProgress[]>(() => {
    const worksBySubjectId = new Map<string, Work[]>()
    for (const work of works) {
      const bucket = worksBySubjectId.get(work.subjectId)
      if (bucket) bucket.push(work)
      else worksBySubjectId.set(work.subjectId, [work])
    }

    return subjects.map((subject) => {
      const subjectWorks = worksBySubjectId.get(subject.id) ?? []
      const completed = subjectWorks.filter((work) => work.status === 'completed').length
      return {
        subject,
        totalWorks: subjectWorks.length,
        remainingWorks: subjectWorks.length - completed,
        overdueWorks: subjectWorks.filter((work) => isOverdue(work.dueDate, work.status)).length,
        completedRatio: subjectWorks.length === 0 ? 0 : completed / subjectWorks.length,
      }
    })
  }, [subjects, works])

  const { addWork: storeAddWork } = store
  const addWork = useCallback(
    (draft: NewWorkDraft) => storeAddWork(draft, ownerEmail),
    [storeAddWork, ownerEmail],
  )

  const isSubjectNameTakenInTerm = useCallback(
    (name: string, targetTerm: AcademicTerm) =>
      allSubjects.some(
        (subject) =>
          subject.academicYear === targetTerm.academicYear &&
          subject.semester === targetTerm.semester &&
          subject.name.trim().toLowerCase() === name.trim().toLowerCase(),
      ),
    [allSubjects],
  )

  return {
    works: sortedWorks,
    subjects,
    subjectsById,
    statusSummary,
    overdueCount,
    upcomingWorks,
    nextDueWork,
    subjectProgressList,
    addWork,
    updateWork: store.updateWork,
    deleteWork: store.deleteWork,
    restoreWork: store.restoreWork,
    addSubject: store.addSubject,
    isSubjectNameTakenInTerm,
  }
}
