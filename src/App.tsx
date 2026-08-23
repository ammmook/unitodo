import { useCallback, useState } from 'react'
import { AppShellSkeleton } from './components/common/LoadingSkeleton'
import { ConfirmDialog } from './components/common/ConfirmDialog'
import { ToastStack } from './components/common/ToastStack'
import { AppHeader } from './components/layout/AppHeader'
import { ImpersonationBanner } from './components/layout/ImpersonationBanner'
import { MobileTabBar } from './components/layout/MobileTabBar'
import { AddSubjectModal } from './components/subject/AddSubjectModal'
import { AddWorkModal } from './components/work/AddWorkModal'
import { CURRENT_TERM } from './data/academicTerms'
import { api } from './lib/api'
import { useSession } from './hooks/useSession'
import { useToasts } from './hooks/useToasts'
import { useTodolistData } from './hooks/useTodolistData'
import { clearSnapshotCache, useTodolistStore } from './hooks/useTodolistStore'
import { AllWorksPage } from './pages/AllWorksPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { SubjectsPage } from './pages/SubjectsPage'
import type {
  AcademicTerm,
  AppUser,
  NewSubjectDraft,
  NewWorkDraft,
  PageName,
  Work,
  WorkStatus,
} from './types/todolist'
import { WORK_TYPE_STYLE, formatDueDate } from './utils/workFormatting'

type OpenModal =
  | { kind: 'none' }
  | { kind: 'addWork'; presetSubjectId?: string }
  | { kind: 'addSubject' }
  | { kind: 'confirmDeleteWork'; work: Work }

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageName>('dashboard')
  const [openModal, setOpenModal] = useState<OpenModal>({ kind: 'none' })
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null)
  const [subjectFilterId, setSubjectFilterId] = useState<string | 'all'>('all')
  const [term, setTerm] = useState<AcademicTerm>(CURRENT_TERM)
  /** อีเมลของคนที่ admin กำลังสวมบทอยู่ — null คือดูข้อมูลของตัวเอง */
  const [viewAsEmail, setViewAsEmail] = useState<string | null>(null)

  const session = useSession()
  const { signOut, expireSession, acceptIssuedSession, confirmSignedIn, credential } = session
  const { toasts, showToast, dismissToast } = useToasts()

  /** ล้างหน้าจอกลับไปเหมือนเพิ่งเข้าแอป — ใช้ทั้งตอนออกจากระบบและตอนสลับบัญชีที่ดู */
  const resetViewState = useCallback(() => {
    setCurrentPage('dashboard')
    setSelectedWorkId(null)
    setSubjectFilterId('all')
    setOpenModal({ kind: 'none' })
    setTerm(CURRENT_TERM)
  }, [])

  const handleSignOut = useCallback(() => {
    // เพิกถอน session ฝั่งเซิร์ฟเวอร์ด้วย ไม่ใช่แค่ลืมมันไปเฉย ๆ — ยิงแบบไม่รอผล
    if (credential?.sessionToken) {
      api.logout(credential).catch(() => {
        // ออฟไลน์อยู่ก็ยังต้องออกจากระบบฝั่งนี้ได้ · session จะหมดอายุเองอยู่แล้ว
      })
    }
    clearSnapshotCache()
    setViewAsEmail(null)
    resetViewState()
    signOut()
  }, [credential, resetViewState, signOut])

  const handleSessionExpired = useCallback(
    (message?: string) => {
      clearSnapshotCache()
      setViewAsEmail(null)
      resetViewState()
      expireSession(message ?? 'เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง')
    },
    [expireSession, resetViewState],
  )

  const handleStoreError = useCallback(
    (message: string) => {
      showToast({ tone: 'error', icon: '⚠️', title: 'บันทึกไม่สำเร็จ', description: message })
    },
    [showToast],
  )

  const store = useTodolistStore({
    credential,
    viewAs: viewAsEmail,
    onError: handleStoreError,
    onUnauthenticated: handleSessionExpired,
    onSessionIssued: acceptIssuedSession,
    onAuthenticated: confirmSignedIn,
  })

  const data = useTodolistData(term, store)

  const closeModal = useCallback(() => setOpenModal({ kind: 'none' }), [])

  const openWorkDetail = useCallback((workId: string) => {
    setCurrentPage('works')
    setSelectedWorkId(workId)
  }, [])

  const handleCreateWork = (draft: NewWorkDraft) => {
    const created = data.addWork(draft)
    const subjectName = data.subjectsById.get(created.subjectId)?.name ?? ''
    showToast({
      tone: 'success',
      icon: '✓',
      title: 'เพิ่มงานแล้ว 🎉',
      description: `${created.title} · ${subjectName} · ${WORK_TYPE_STYLE[created.type].label} · ส่ง ${formatDueDate(created.dueDate, false)}`,
      actionLabel: 'ดูงาน',
      onAction: () => openWorkDetail(created.id),
    })
  }

  const handleCreateSubject = (draft: NewSubjectDraft) => {
    const created = data.addSubject(draft)
    showToast({
      tone: 'neutral',
      icon: '📚',
      title: 'เพิ่มวิชาแล้ว',
      description: `${created.name} · เทอม ${created.semester} / ${created.academicYear}`,
    })
  }

  const handleToggleCompleted = (work: Work) => {
    const nextStatus: WorkStatus = work.status === 'completed' ? 'notStarted' : 'completed'
    data.updateWork(work.id, { status: nextStatus })

    if (nextStatus === 'completed') {
      const remaining = data.statusSummary.total - data.statusSummary.completed - 1
      showToast({
        tone: 'success',
        icon: '✓',
        title: 'Done! เยี่ยมมาก 🎉',
        description: `${work.title} เสร็จแล้ว — เหลืออีก ${remaining} งาน`,
      })
    }
  }

  const handleChangeStatus = (work: Work, status: WorkStatus) => {
    if (work.status === status) return
    data.updateWork(work.id, { status })

    if (status === 'inProgress') {
      showToast({
        tone: 'info',
        icon: '⚡',
        title: 'เริ่มทำแล้ว',
        description: `${work.title} เปลี่ยนเป็น In Progress`,
      })
    } else if (status === 'completed') {
      showToast({
        tone: 'success',
        icon: '✓',
        title: 'Done! เยี่ยมมาก 🎉',
        description: `${work.title} เสร็จแล้ว`,
      })
    }
  }

  const handleSaveNote = (work: Work, note: string) => {
    data.updateWork(work.id, { note })
    showToast({
      tone: 'progress',
      icon: '💾',
      title: 'บันทึกแล้ว',
      description: work.title,
    })
  }

  const handleDeleteWork = (work: Work) => {
    data.deleteWork(work.id)
    setSelectedWorkId(null)
    closeModal()
    showToast({
      tone: 'neutral',
      icon: '🗑️',
      title: 'ลบงานแล้ว',
      description: `${work.title} · ${data.subjectsById.get(work.subjectId)?.name ?? ''}`,
      actionLabel: 'Undo',
      onAction: () => data.restoreWork(work),
    })
  }

  const handleStartNextWork = () => {
    if (!data.nextDueWork) return
    handleChangeStatus(data.nextDueWork, 'inProgress')
    openWorkDetail(data.nextDueWork.id)
  }

  /** admin กดปุ่ม 👁 — สวมบทเป็นผู้ใช้คนนั้นทันที เห็นและแก้ได้ทุกอย่างเหมือนเจ้าตัว */
  const handleViewAsUser = (user: AppUser) => {
    const isSelf = user.email === store.me?.email
    setViewAsEmail(isSelf ? null : user.email)
    resetViewState()
    showToast({
      tone: 'info',
      icon: '👁',
      title: isSelf ? 'กลับมาที่บัญชีของคุณ' : 'สวมบทเป็นผู้ใช้',
      description: isSelf ? undefined : `กำลังดูข้อมูลของ ${user.email}`,
    })
  }

  const handleExitImpersonation = () => {
    setViewAsEmail(null)
    resetViewState()
  }

  const goToSubjectWorks = (subjectId: string) => {
    setSubjectFilterId(subjectId)
    setCurrentPage('works')
  }

  // ต้องล็อกอิน Google ก่อนถึงจะเข้าแอปได้
  // ถ้ามี session เก่าอยู่ status จะเป็น 'checking' ตั้งแต่แรก หน้านี้จึงไม่แวบขึ้นมาก่อน
  if (session.status === 'signedOut') {
    return (
      <LoginPage
        isGoogleReady={session.isGoogleReady}
        isAuthenticating={session.isAuthenticating}
        authError={session.authError}
      />
    )
  }

  // ยังไม่รู้ว่าเราเป็นใคร — โหลดครั้งแรกเท่านั้น ครั้งต่อ ๆ ไปมี cache ให้วาดทันที
  if (!store.me || !store.viewingAs) {
    return store.loadError ? (
      <LoadFailed error={store.loadError} onRetry={store.refresh} onSignOut={handleSignOut} />
    ) : (
      <AppShellSkeleton variant={currentPage === 'subjects' ? 'grid' : currentPage === 'works' ? 'list' : 'dashboard'} />
    )
  }

  const isImpersonating = viewAsEmail !== null

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      {isImpersonating && (
        <ImpersonationBanner viewingUser={store.viewingAs} onExit={handleExitImpersonation} />
      )}

      <AppHeader
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        term={term}
        onTermChange={setTerm}
        user={store.viewingAs}
        onSignOut={handleSignOut}
      />

      {store.loadError && (
        <p
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-overdue/30 bg-overdue-soft px-[18px] py-2.5 text-[12.5px] font-semibold text-overdue-ink-strong lg:px-8"
        >
          <span className="min-w-0 flex-1">ข้อมูลอาจไม่ใช่ล่าสุด · {store.loadError}</span>
          <button
            type="button"
            onClick={store.refresh}
            className="min-h-9 shrink-0 rounded-[11px] border border-overdue/40 bg-white px-3 text-[12px] font-bold"
          >
            ลองใหม่
          </button>
        </p>
      )}

      <div className="flex-1">
        {currentPage === 'dashboard' && (
          <DashboardPage
            data={data}
            term={term}
            onTermChange={setTerm}
            user={store.viewingAs}
            onSignOut={handleSignOut}
            isLoading={store.isLoading}
            onOpenWork={openWorkDetail}
            onStartNextWork={handleStartNextWork}
            onGoToAllWorks={() => setCurrentPage('works')}
            onAddWork={() => setOpenModal({ kind: 'addWork' })}
          />
        )}

        {currentPage === 'works' && (
          <AllWorksPage
            data={data}
            term={term}
            onTermChange={setTerm}
            isLoading={store.isLoading}
            selectedWorkId={selectedWorkId}
            onSelectWork={setSelectedWorkId}
            onToggleCompleted={handleToggleCompleted}
            onChangeStatus={handleChangeStatus}
            onSaveNote={handleSaveNote}
            onRequestDelete={(work) => setOpenModal({ kind: 'confirmDeleteWork', work })}
            onAddWork={() => setOpenModal({ kind: 'addWork' })}
            subjectFilterId={subjectFilterId}
            onSubjectFilterChange={setSubjectFilterId}
          />
        )}

        {currentPage === 'subjects' && (
          <SubjectsPage
            data={data}
            term={term}
            currentUser={store.me}
            viewingUser={store.viewingAs}
            allUsers={store.users}
            isLoading={store.isLoading}
            onAddSubject={() => setOpenModal({ kind: 'addSubject' })}
            onAddWorkForSubject={(subjectId) => setOpenModal({ kind: 'addWork', presetSubjectId: subjectId })}
            onOpenSubjectWorks={goToSubjectWorks}
            onViewAsUser={handleViewAsUser}
          />
        )}
      </div>

      <MobileTabBar currentPage={currentPage} onNavigate={setCurrentPage} />

      {openModal.kind === 'addWork' && (
        <AddWorkModal
          subjects={data.subjects}
          term={term}
          presetSubjectId={openModal.presetSubjectId}
          onClose={closeModal}
          onCreated={handleCreateWork}
        />
      )}

      {openModal.kind === 'addSubject' && (
        <AddSubjectModal
          term={term}
          ownerEmail={store.viewingAs.email}
          isNameTaken={data.isSubjectNameTakenInTerm}
          onClose={closeModal}
          onCreated={handleCreateSubject}
        />
      )}

      {openModal.kind === 'confirmDeleteWork' && (
        <ConfirmDialog
          icon="🗑️"
          title={`ลบงาน “${openModal.work.title}”?`}
          description="งานนี้จะหายไปจากรายการ กด Undo ในแจ้งเตือนเพื่อเอากลับมาได้"
          confirmLabel="ลบเลย"
          onConfirm={() => handleDeleteWork(openModal.work)}
          onCancel={closeModal}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

/** จอตอนโหลดข้อมูลครั้งแรกไม่สำเร็จเลย — ยังไม่มีอะไรให้แสดงจึงเต็มจอ */
function LoadFailed({
  error,
  onRetry,
  onSignOut,
}: {
  error: string
  onRetry: () => void
  onSignOut: () => void
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-cream p-5 text-center">
      <div className="w-full max-w-[360px]">
        <span
          aria-hidden="true"
          className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[17px] bg-highlight text-[21px] font-extrabold text-ink"
        >
          T
        </span>

        <h1 className="text-[19px] font-extrabold">โหลดข้อมูลไม่สำเร็จ</h1>
        <p role="alert" className="mt-2 text-[13px] text-ink/75">
          {error}
        </p>
        <div className="mt-5 flex justify-center gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-[13px] bg-ink px-4 text-[13px] font-bold text-white"
          >
            ลองใหม่
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="min-h-11 rounded-[13px] border border-ink/20 bg-white px-4 text-[13px] font-bold text-ink"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  )
}
