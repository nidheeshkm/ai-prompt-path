'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase, type Enrollment, type Certificate } from './supabase'
import { useAuth } from './auth-context'

type EnrollmentState = {
  enrollments: Enrollment[]
  certificates: Certificate[]
  loading: boolean
  isEnrolled: (courseId: string) => boolean
  enroll: (courseId: string) => Promise<void>
  getCertificate: (courseId: string) => Certificate | undefined
  refreshEnrollments: () => Promise<void>
}

const EnrollmentContext = createContext<EnrollmentState>({
  enrollments: [],
  certificates: [],
  loading: true,
  isEnrolled: () => false,
  enroll: async () => {},
  getCertificate: () => undefined,
  refreshEnrollments: async () => {},
})

export function EnrollmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!user) {
      setEnrollments([])
      setCertificates([])
      setLoading(false)
      return
    }
    const [{ data: envData }, { data: certData }] = await Promise.all([
      supabase.from('enrollments').select('*').eq('user_id', user.id),
      supabase.from('certificates').select('*').eq('user_id', user.id),
    ])

    // Backward-compat: any user with no enrollments (registered before enrollment was
    // introduced, or missed by the SQL backfill) is auto-enrolled in the starter course.
    if ((envData?.length ?? 0) === 0) {
      await supabase
        .from('enrollments')
        .upsert({ user_id: user.id, course_id: 'promptpath-starter' }, { onConflict: 'user_id,course_id' })
      const { data: refreshed } = await supabase
        .from('enrollments').select('*').eq('user_id', user.id)
      setEnrollments(refreshed || [])
    } else {
      setEnrollments(envData || [])
    }

    setCertificates(certData || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchAll() }, [fetchAll])

  const isEnrolled = useCallback(
    (courseId: string) => enrollments.some(e => e.course_id === courseId),
    [enrollments]
  )

  const enroll = useCallback(async (courseId: string) => {
    if (!user) return
    await supabase.from('enrollments').upsert(
      { user_id: user.id, course_id: courseId },
      { onConflict: 'user_id,course_id' }
    )
    await fetchAll()
  }, [user, fetchAll])

  const getCertificate = useCallback(
    (courseId: string) => certificates.find(c => c.course_id === courseId),
    [certificates]
  )

  return (
    <EnrollmentContext.Provider value={{
      enrollments,
      certificates,
      loading,
      isEnrolled,
      enroll,
      getCertificate,
      refreshEnrollments: fetchAll,
    }}>
      {children}
    </EnrollmentContext.Provider>
  )
}

export const useEnrollment = () => useContext(EnrollmentContext)
