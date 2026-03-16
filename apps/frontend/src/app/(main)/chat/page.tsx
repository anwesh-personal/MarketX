'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatRedirect() {
    const router = useRouter()
    useEffect(() => { router.replace('/brain-chat') }, [router])
    return null
}
