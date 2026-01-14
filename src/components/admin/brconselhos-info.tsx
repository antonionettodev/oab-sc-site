'use client'

import React from 'react'

const BRConselhosInfo: React.FC = () => {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: 'var(--theme-elevation-50)',
        borderRadius: '4px',
        marginTop: '16px',
      }}
    >
      <h4 style={{ marginTop: 0, marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
        Integração BR Conselhos
      </h4>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--theme-elevation-800)' }}>
        Os dados deste advogado são sincronizados automaticamente com o sistema BR Conselhos da OAB
        durante o login. A última sincronização indica quando os dados foram atualizados pela última
        vez.
      </p>
      <div
        style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: 'var(--theme-elevation-100)',
          borderRadius: '4px',
          fontSize: '12px',
        }}
      >
        <strong>Métodos de Autenticação:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>
            <strong>Login via API:</strong> POST /api/lawyers/login-brconselhos
          </li>
          <li>
            <strong>Headers:</strong> X-BRConselhos-Usuario e X-BRConselhos-Senha
          </li>
          <li>
            <strong>Sincronização:</strong> POST /api/lawyers/sync-brconselhos
          </li>
        </ul>
      </div>
    </div>
  )
}

export default BRConselhosInfo
