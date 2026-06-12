'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

const SHUTRIX_REGISTER_URL = 'https://shutrix.com/create-account'

export default function RegisterPage() {
  useEffect(() => {
    window.location.href = SHUTRIX_REGISTER_URL
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md text-center"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Create your account</h1>
        <p className="text-muted-foreground">
          Account registration is managed on Shutrix.
        </p>
      </div>

      <p className="text-sm text-muted-foreground mb-4">Redirecting you now…</p>

      <a
        href={SHUTRIX_REGISTER_URL}
        className="inline-flex items-center gap-2 text-gold hover:text-gold-light font-medium transition-colors text-sm"
      >
        Go to shutrix.com/create-account
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </motion.div>
  )
}
