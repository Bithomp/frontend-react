import { useEffect, useState } from 'react'
import { useTranslation } from 'next-i18next'
import axios from 'axios'

import { encode, isUrlValid } from '../../utils'
import styles from '../../styles/components/setAvatar.module.scss'

const fileSha256 = async (file) => {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export default function SetAvatar({
  setSignRequest,
  signRequest,
  setStatus,
  setAgreedToRisks,
  sessionToken,
  openEmailLogin
}) {
  const { t } = useTranslation('common')
  const [mode, setMode] = useState('url')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const prepareAvatarRequest = (avatarUrl) => {
    if (!isUrlValid(avatarUrl)) {
      setStatus(t('signin.set-account.invalid-url'))
      setAgreedToRisks(false)
      return
    }

    const command = {
      action: 'setAvatar',
      url: avatarUrl,
      timestamp: new Date().toISOString()
    }

    setSignRequest({
      ...signRequest,
      request: {
        Account: signRequest?.request?.Account,
        TransactionType: 'AccountSet',
        Memos: [
          {
            Memo: {
              MemoType: encode('json'),
              MemoData: encode(JSON.stringify(command))
            }
          }
        ]
      }
    })
    setStatus('')
    setAgreedToRisks(true)
  }

  const selectMode = (nextMode) => {
    setMode(nextMode)
    setStatus('')
    setAgreedToRisks(false)
  }

  const onAvatarChange = (event) => {
    prepareAvatarRequest(event.target.value.trim())
  }

  const onFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null
    if (previewUrl) URL.revokeObjectURL(previewUrl)

    if (nextFile && !nextFile.type.startsWith('image/')) {
      setFile(null)
      setPreviewUrl('')
      setStatus(t('signin.set-account.invalid-image'))
      return
    }

    setFile(nextFile)
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : '')
    setStatus('')
    setAgreedToRisks(false)
  }

  const uploadAvatar = async () => {
    if (!file || !sessionToken || uploading) return

    setUploading(true)
    setStatus(t('signin.set-account.uploading-avatar'))
    try {
      const digest = await fileSha256(file)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('digest', digest)

      const response = await axios.post('v2/avatar/upload', formData, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      })
      const uploadUrl = response?.data?.uploadUrl
      if (!isUrlValid(uploadUrl)) throw new Error(response?.data?.error || 'Invalid upload URL')

      prepareAvatarRequest(uploadUrl)
    } catch (error) {
      setStatus(error?.response?.data?.error || error?.message || t('signin.set-account.upload-failed'))
      setAgreedToRisks(false)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`center ${styles.avatarForm}`}>
      <div className={styles.modeSwitch} role="tablist" aria-label={t('signin.set-account.avatar-source')}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'url'}
          className={mode === 'url' ? styles.active : ''}
          onClick={() => selectMode('url')}
        >
          {t('signin.set-account.from-url')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'upload'}
          className={mode === 'upload' ? styles.active : ''}
          onClick={() => selectMode('upload')}
        >
          {t('signin.set-account.upload-image')}
        </button>
      </div>

      <div className={styles.modeContent}>
        {mode === 'url' ? (
          <span className="halv">
            <span className="input-title">{t('signin.set-account.avatar-url')}</span>
            <input
              placeholder={t('signin.set-account.enter-avatar-url')}
              onChange={onAvatarChange}
              className="input-text"
              spellCheck="false"
            />
          </span>
        ) : !sessionToken ? (
          <div className={styles.authRequired}>
            <p>{t('signin.set-account.upload-auth-required')}</p>
            <button type="button" className="button-action" onClick={() => openEmailLogin()}>
              {t('email-login.sign-in')}
            </button>
          </div>
        ) : (
          <div className={styles.uploadPanel}>
            <label className={styles.filePicker}>
              <input type="file" accept="image/*" onChange={onFileChange} />
              <span>{file?.name || t('signin.set-account.choose-image')}</span>
            </label>
            {previewUrl ? <img className={styles.preview} src={previewUrl} alt="" /> : null}
            <button type="button" className="button-action" disabled={!file || uploading} onClick={uploadAvatar}>
              {uploading ? t('signin.set-account.uploading-avatar') : t('signin.set-account.upload-image')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
