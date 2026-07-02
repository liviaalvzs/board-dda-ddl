import pb from '@/lib/pocketbase/client'

export const checkEmail = (email: string) =>
  pb.send('/backend/v1/check-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: { 'Content-Type': 'application/json' },
  })

export const preRegisterUser = (email: string, name?: string) =>
  pb.send('/backend/v1/pre-register-user', {
    method: 'POST',
    body: JSON.stringify({ email, name }),
    headers: { 'Content-Type': 'application/json' },
  })

export const getUsers = () => pb.send('/backend/v1/users', { method: 'GET' })
