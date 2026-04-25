# Playbook de Suporte — Login e Resgate

Guia rapido para resolver problemas comuns de acesso no Metodo Baratieri.

## 1) Tela em loop (recarregando sem parar)

- Orientar o usuario a abrir `login.html`.
- Clicar em **Corrigir acesso**.
- Inserir o codigo de licenca novamente.
- Tentar login.

Resultado esperado: o loop para e o login volta ao fluxo normal.

## 2) Usuario esqueceu o codigo

- No `login.html`, clicar em **Resgatar licenca**.
- Informar o mesmo e-mail usado na compra.
- Copiar o codigo retornado.
- Voltar ao login e colar o codigo.

## 3) Resgate retorna "nao encontrado"

- Confirmar se o e-mail digitado e exatamente o da compra.
- Pedir para testar e-mail alternativo (quando houver).
- Se persistir, verificar no admin se existe registro para esse e-mail.

## 4) Resgate retorna "licenca bloqueada"

- No admin, verificar o campo `blocked`.
- Se `blocked=true`, tratar conforme politica interna antes de desbloquear.
- Se `blocked=false` e ainda houver bloqueio, escalar para revisao tecnica.

## 5) Codigo valido, mas login nao entra

- Confirmar se o usuario colou o codigo completo (sem espacos extras).
- Verificar no admin se a licenca esta ativa e nao expirada.
- Em caso de expiracao, orientar renovacao.

## 6) Limite de dispositivos atingido

- Verificar `DeviceCount` e `MaxDevices` no admin.
- Decidir entre:
  - aumentar limite, ou
  - limpar/ajustar dispositivos conforme politica.
- Pedir novo login apos o ajuste.

## 7) Trial/assinatura expirada

- Orientar compra/renovacao.
- Depois da compra: resgatar licenca novamente e fazer login.

## 8) Quando escalar para suporte tecnico

Escalar quando ocorrer qualquer um dos casos abaixo:

- comportamento inconsistente (ex.: resgata bloqueado, mas login com codigo funciona);
- erro de servidor recorrente;
- muitos usuarios com o mesmo sintoma no mesmo dia.

## Mensagem curta sugerida para atendimento

"Vamos resolver em 1 minuto: abra a tela de login, clique em **Corrigir acesso**, depois informe seu codigo novamente. Se nao lembrar o codigo, clique em **Resgatar licenca** e use o e-mail da compra."

