import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useNavigationShortcuts = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Alt + Left Arrow = Back
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                navigate(-1);
            }

            // Alt + Right Arrow = Forward
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                navigate(1);
            }

            // Alt + Home = Go to Home
            if (e.altKey && e.key === 'Home') {
                e.preventDefault();
                navigate('/');
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [navigate]);
};
