import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { supabase } from './utils/supabase'

function App() {
  const [count, setCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  // Carga el contador guardado al montar el componente
  useEffect(() => {
    async function loadCount() {
      const { data, error } = await supabase
        .from('clicks')
        .select('count')
        .eq('id', 1)
        .single()

      if (!error && data) {
        setCount(data.count)
      }
      setLoading(false)
    }
    loadCount()
  }, [])

  async function handleCount() {
    const newCount = count + 1
    setCount(newCount)
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('clicks')
      .update({ count: newCount })
      .eq('id', 1)

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Guardado en Supabase!')
    }
    setSaving(false)
  }

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={handleCount} disabled={saving || loading}>
          {loading ? 'Cargando...' : saving ? 'Guardando...' : `count is ${count}`}
        </button>
        {message && <p>{message}</p>}
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
