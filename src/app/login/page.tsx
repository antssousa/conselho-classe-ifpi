import { loginAction } from "../actions";
import { ActionForm } from "@/components/forms/action-form";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Acesso local</h1>
      <p className="mt-2 text-sm text-slate-600">Entre com um usuário do seed. Senha padrão: ifpi123.</p>
      <ActionForm action={loginAction} className="mt-6 space-y-4">
        <Field label="E-mail">
          <input name="email" type="email" defaultValue="admin@ifpi.edu.br" required />
        </Field>
        <Field label="Senha">
          <input name="password" type="password" defaultValue="ifpi123" required />
        </Field>
        <SubmitButton className="w-full rounded-md bg-ifpi-green px-4 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300">
          Entrar
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
