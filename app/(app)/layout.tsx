import { AppShell } from '@/components/app-shell/app-shell'
import { getUser } from '@/lib/queries/user'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await getUser()
  return <AppShell user={user}>{children}</AppShell>
}
