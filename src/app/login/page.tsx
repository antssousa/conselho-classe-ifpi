import { loginAction } from "../actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Acesso local</h1>
      <p className="mt-2 text-sm text-slate-600">Entre com um usuário do seed. Senha padrão: ifpi123.</p>
      {searchParams.error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          E-mail ou senha inválidos.
        </div>
      ) : null}
      <form action={loginAction} className="mt-6 space-y-4">
        <div className="grid gap-1">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" defaultValue="admin@ifpi.edu.br" required />
        </div>
        <div className="grid gap-1">
          <label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" defaultValue="ifpi123" required />
        </div>
        <button className="w-full rounded-md bg-ifpi-green px-4 py-2 text-sm font-bold text-white hover:bg-green-800">
          Entrar
        </button>
      </form>
    </div>
  );
}
