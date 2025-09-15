import { useState, useCallback } from 'react'

export const useEmailLogin = () => {
  const [isEmailLoginOpen, setIsEmailLoginOpen] = useState(false)
  const [onLoginSuccess, setOnLoginSuccess] = useState(null)

  const openEmailLogin = useCallback((onSuccess = null) => {
    setIsEmailLoginOpen(true)
    setOnLoginSuccess(() => onSuccess)
  }, [])

  const closeEmailLogin = useCallback(() => {
    setIsEmailLoginOpen(false)
    setOnLoginSuccess(null)
  }, [])

  const handleLoginSuccess = useCallback(() => {
    closeEmailLogin()
  }, [onLoginSuccess, closeEmailLogin])

  return {
    isEmailLoginOpen,
    openEmailLogin,
    closeEmailLogin,
    handleLoginSuccess
  }
} 