import { useCallback, useMemo, useState } from 'react'
import {
  MOCK_SUBJECTS,
  MOCK_WORKS,
  SIGNED_IN_USER,
  SUBJECT_EMOJI_POOL,
} from '../data/mockTodolist'
import type {
  NewSubjectDraft,
  NewWorkDraft,
  Subject,
  Work,
} from '../types/todolist'
import { daysUntilDue, isOverdue } from '../utils/workFormatting'

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
  hasSubjectName: (name: string) => boolean
}

/** เรียงงานตามความเร่งด่วน: ยังไม่เสร็จก่อน แล้วค่อยเรียงตามกำหนดส่ง */
function compareByUrgency(left: Work, right: Work): number {
  const leftDone = left.status === 'completed' ? 1 : 0
  const rightDone = right.status === 'completed' ? 1 : 0
  if (leftDone !== rightDone) return leftDone - rightDone
  return left.dueDate.localeCompare(right.dueDate)
}

/** แหล่งข้อมูลกลางของทั้งแอป — ตอนนี้เก็บใน memory, ภายหลังสลับไปเรียก API ได้ที่เดียว */
export function useTodolistData(): TodolistData {
  const [works, setWorks] = useState<Work[]>(MOCK_WORKS)
  const [subjects, setSubjects] = useState<Subject[]>(MOCK_SUBJECTS)

  const subjectsById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  )

  const sortedWorks = useMemo(() => [...works].sort(compareByUrgency), [works])

  const statusSummary = useMemo<WorkStatusSummary>(() => {
    const summary: WorkStatusSummary = { notStarted: 0, inProgress: 0, completed: 0, total: works.length }
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

  const subjectProgressList = useMemo<SubjectProgress[]>(
    () =>
      subjects.map((subject) => {
        const subjectWorks = works.filter((work) => work.subjectId === subject.id)
        const completed = subjectWorks.filter((work) => work.status === 'completed').length
        return {
          subject,
          totalWorks: subjectWorks.length,
          remainingWorks: subjectWorks.length - completed,
          overdueWorks: subjectWorks.filter((work) => isOverdue(work.dueDate, work.status)).length,
          completedRatio: subjectWorks.length === 0 ? 0 : completed / subjectWorks.length,
        }
      }),
    [subjects, works],
  )

  const addWork = useCallback((draft: NewWorkDraft): Work => {
    const createdWork: Work = {
      id: `work-${Date.now()}`,
      title: draft.title.trim(),
      subjectId: draft.subjectId,
      type: draft.type === '' ? 'homework' : draft.type,
      status: 'notStarted',
      priority: draft.priority,
      dueDate: draft.dueDate,
      note: draft.note.trim(),
      createdAt: new Date().toISOString(),
      ownerEmail: SIGNED_IN_USER.email,
    }
    setWorks((current) => [createdWork, ...current])
    return createdWork
  }, [])

  const updateWork = useCallback((id: string, changes: Partial<Work>) => {
    setWorks((current) =>
      current.map((work) => (work.id === id ? { ...work, ...changes } : work)),
    )
  }, [])

  const deleteWork = useCallback((id: string) => {
    setWorks((current) => current.filter((work) => work.id !== id))
  }, [])

  const restoreWork = useCallback((work: Work) => {
    setWorks((current) => [work, ...current])
  }, [])

  const hasSubjectName = useCallback(
    (name: string) =>
      subjects.some(
        (subject) => subject.name.trim().toLowerCase() === name.trim().toLowerCase(),
      ),
    [subjects],
  )

  const addSubject = useCallback((draft: NewSubjectDraft): Subject => {
    const createdSubject: Subject = {
      id: `subject-${Date.now()}`,
      name: draft.name.trim(),
      emoji: SUBJECT_EMOJI_POOL[Math.floor(Math.random() * SUBJECT_EMOJI_POOL.length)],
      academicYear: draft.academicYear,
      semester: draft.semester,
    }
    setSubjects((current) => [...current, createdSubject])
    return createdSubject
  }, [])

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
    updateWork,
    deleteWork,
    restoreWork,
    addSubject,
    hasSubjectName,
  }
}
