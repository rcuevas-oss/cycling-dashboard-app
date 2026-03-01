import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { Session } from '@supabase/supabase-js'

interface AuthProps {
    onSessionChange: (session: Session | null) => void;
}

export function AuthUI({ onSessionChange }: AuthProps) {
    const [session, setSession] = useState<Session | null>(null)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            onSessionChange(session)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            onSessionChange(session)
        })

        return () => subscription.unsubscribe()
    }, [onSessionChange])

    if (session) {
        return null; // Component is hidden if logged in
    }

    return (
        <div className="w-full">
            <Auth
                supabaseClient={supabase}
                appearance={{
                    theme: ThemeSupa,
                    variables: {
                        default: {
                            colors: {
                                brand: '#007cc3', // garmin-blue
                                brandAccent: '#fc4c02', // strava-orange
                                inputText: 'white',
                                defaultButtonBackground: '#27272a',
                                defaultButtonBackgroundHover: '#3f3f46',
                                inputBackground: '#18181b',
                                inputBorder: '#27272a',
                                inputBorderHover: '#007cc3',
                                inputBorderFocus: '#007cc3',
                            }
                        }
                    }
                }}
                providers={[]} // Sin redes sociales por ahora
                theme="dark"
            />
        </div>
    )
}
