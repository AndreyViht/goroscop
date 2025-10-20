/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { createClient } from '@supabase/supabase-js';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';

const SUPABASE_URL = 'https://irtwyprryptdqtusxjvc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydHd5cHJyeXB0ZHF0dXN4anZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODA3NzIsImV4cCI6MjA3NDA1Njc3Mn0.YcL9S3a_RxK9CuWNkhicjCLVbTf0jTmLvsbwxXLkB4w';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PERIODS = ['Вчера', 'Сегодня', 'Завтра', 'Неделю', 'Год'];

interface Horoscope {
  summary: string;
  details: string;
  imageUrl: string; // Renamed from image_base64 for consistency
  loading: boolean;
  sources: { uri: string; title: string }[];
}

type Horoscopes = Record<string, Horoscope>;

// --- Helper Functions ---
const getZodiacSign = (date: Date): { sign: string; emoji: string } => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { sign: "Овен", emoji: "♈" };
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { sign: "Телец", emoji: "♉" };
    if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return { sign: "Близнецы", emoji: "♊" };
    if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return { sign: "Рак", emoji: "♋" };
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { sign: "Лев", emoji: "♌" };
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { sign: "Дева", emoji: "♍" };
    if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return { sign: "Весы", emoji: "♎" };
    if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return { sign: "Скорпион", emoji: "♏" };
    if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return { sign: "Стрелец", emoji: "♐" };
    if ((month === 12 && day >= 22) || (month === 1 && day <= 20)) return { sign: "Козерог", emoji: "♑" };
    if ((month === 1 && day >= 21) || (month === 2 && day <= 18)) return { sign: "Водолей", emoji: "♒" };
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return { sign: "Рыбы", emoji: "♓" };
    return { sign: "Неизвестно", emoji: "✨" };
};

const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')} часов ${minutes.toString().padStart(2, '0')} минут`;
};


// --- Components ---
const CardLoader = () => (
    <div className="card-loader">
        <div className="spinner"></div>
        <p>Создаем предсказание...</p>
    </div>
);

const HoroscopeCard = ({ title, horoscope }: { title: string; horoscope: Horoscope }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isFullyExpanded, setIsFullyExpanded] = useState(false);

    const handleHeaderClick = () => {
        if (isExpanded) setIsFullyExpanded(false);
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="card">
            <button className="card-header" onClick={handleHeaderClick} aria-expanded={isExpanded} disabled={horoscope.loading}>
                <h3>На {title}</h3>
                <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
            </button>
            <div className={`card-content ${isExpanded ? 'expanded' : ''} ${horoscope.loading ? 'loading' : ''}`}>
                <div className="card-body">
                    {horoscope.loading ? <CardLoader /> : (
                        <>
                            {horoscope.imageUrl && <img src={horoscope.imageUrl} alt={`Астрологический образ для ${title}`} className="card-image"/>}
                            <p className="card-summary">{horoscope.summary || 'Предсказание скоро появится...'}</p>
                            {horoscope.details && (
                                <>
                                    <button className="read-more-button" onClick={() => setIsFullyExpanded(!isFullyExpanded)} aria-expanded={isFullyExpanded}>
                                        {isFullyExpanded ? 'Свернуть' : 'Читать далее'}
                                    </button>
                                    <div className={`card-details-wrapper ${isFullyExpanded ? 'visible' : ''}`}>
                                        <p className="card-details">{horoscope.details}</p>
                                        {horoscope.sources && horoscope.sources.length > 0 && (
                                            <div className="card-sources">
                                                <h4>Источники:</h4>
                                                <ul>{horoscope.sources.map((s, i) => <li key={i}><a href={s.uri} target="_blank" rel="noopener noreferrer">{s.title}</a></li>)}</ul>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const UpdateInfo = () => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
            
            const nextUpdate = new Date(moscowTime);
            nextUpdate.setDate(moscowTime.getDate() + (moscowTime.getHours() >= 0 && moscowTime.getMinutes() >= 1 ? 1 : 0));
            nextUpdate.setHours(0, 1, 0, 0);

            const diff = (nextUpdate.getTime() - moscowTime.getTime()) / 1000;
            setTimeLeft(formatTime(diff));
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="update-info">
            <h4>✨ Viht прогнозирует ваш гороскоп</h4>
            <p className="timer">До обновления: <strong>{timeLeft}</strong></p>
            <p className="update-logic">
                Гороскоп на 'Сегодня' и 'Завтра' обновляется каждый день в 00:01 МСК.
                'Неделя' — каждый Понедельник. 'Год' — 1-го числа каждого месяца. 'Вчера' — не меняется.
            </p>
        </div>
    );
};


function App() {
    const [date, setDate] = useState<{ day: string; month: string; year: string }>({ day: '', month: '', year: '' });
    const [isDateSet, setIsDateSet] = useState(false);
    const [zodiac, setZodiac] = useState<{ sign: string; emoji: string } | null>(null);
    const [horoscopes, setHoroscopes] = useState<Horoscopes | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const getHoroscopes = useCallback(async (currentDate: {day: string, month: string, year: string}) => {
        if (!currentDate.day || !currentDate.month || !currentDate.year) {
            setLoading(false);
            return;
        }
        setError('');
        
        const birthDate = new Date(`${currentDate.year}-${currentDate.month}-${currentDate.day}`);
        const currentZodiac = getZodiacSign(birthDate);
        setZodiac(currentZodiac);
        setIsDateSet(true);
        setLoading(false);
        
        localStorage.setItem('horoscopeDate', JSON.stringify(currentDate));
        
        const initialHoroscopes = PERIODS.reduce((acc, period) => {
            acc[period] = { summary: '', details: '', imageUrl: '', loading: true, sources: [] };
            return acc;
        }, {} as Horoscopes);
        setHoroscopes(initialHoroscopes);

        try {
            const { data, error: functionError } = await supabase.functions.invoke('get-horoscope', {
                body: { sign: currentZodiac.sign },
            });

            if (functionError) throw functionError;
            if (data.error) throw new Error(data.error);

            // Populate horoscopes with data from backend
            const fetchedHoroscopes = PERIODS.reduce((acc, period) => {
                const horoscopeData = data.find(h => h.period === period);
                acc[period] = {
                    summary: horoscopeData?.summary || 'Предсказание скоро появится...',
                    details: horoscopeData?.details || '',
                    imageUrl: horoscopeData?.image_base64 || '',
                    loading: false,
                    sources: horoscopeData?.sources || [],
                };
                return acc;
            }, {} as Horoscopes);
            setHoroscopes(fetchedHoroscopes);

        } catch (e: any) {
            console.error("Ошибка при вызове функции Supabase:", e);
            setError(`Не удалось загрузить гороскоп. Ошибка: ${e.message}`);
            const errorState = PERIODS.reduce((acc, period) => {
                acc[period] = { summary: 'Ошибка загрузки', details: '', imageUrl: '', loading: false, sources: [] };
                return acc;
            }, {} as Horoscopes);
            setHoroscopes(errorState);
        }
    }, []);

    useEffect(() => {
        const checkSavedDate = () => {
            try {
                const savedDate = localStorage.getItem('horoscopeDate');
                if (savedDate) {
                    const parsedDate = JSON.parse(savedDate);
                    setDate(parsedDate);
                    getHoroscopes(parsedDate);
                } else {
                    setLoading(false);
                }
            } catch (e) {
                console.error("Ошибка чтения localStorage", e);
                localStorage.removeItem('horoscopeDate');
                setLoading(false);
            }
        };
        checkSavedDate();
    }, [getHoroscopes]);

    // Grab-to-scroll functionality
    useEffect(() => {
        const slider = scrollContainerRef.current;
        if (!slider) return;
        let isDown = false, startX: number, scrollLeft: number;
        const onMouseDown = (e: MouseEvent) => { isDown = true; slider.classList.add('grabbing'); startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; };
        const onMouseLeave = () => { isDown = false; slider.classList.remove('grabbing'); };
        const onMouseUp = () => { isDown = false; slider.classList.remove('grabbing'); };
        const onMouseMove = (e: MouseEvent) => { if (!isDown) return; e.preventDefault(); const x = e.pageX - slider.offsetLeft; const walk = (x - startX) * 2; slider.scrollLeft = scrollLeft - walk; };
        slider.addEventListener('mousedown', onMouseDown);
        slider.addEventListener('mouseleave', onMouseLeave);
        slider.addEventListener('mouseup', onMouseUp);
        slider.addEventListener('mousemove', onMouseMove);
        return () => {
            slider.removeEventListener('mousedown', onMouseDown);
            slider.removeEventListener('mouseleave', onMouseLeave);
            slider.removeEventListener('mouseup', onMouseUp);
            slider.removeEventListener('mousemove', onMouseMove);
        };
    }, [isDateSet]);

    const handleDateChange = () => {
        localStorage.removeItem('horoscopeDate');
        setIsDateSet(false);
        setZodiac(null);
        setHoroscopes(null);
        setDate({ day: '', month: '', year: '' });
    };
    
    const years = useMemo(() => Array.from({length: new Date().getFullYear() - 1939}, (_, i) => new Date().getFullYear() - i), []);
    const months = useMemo(() => [
        {value: "01", name: "Январь"}, {value: "02", name: "Февраль"}, {value: "03", name: "Март"},
        {value: "04", name: "Апрель"}, {value: "05", name: "Май"}, {value: "06", name: "Июнь"},
        {value: "07", name: "Июль"}, {value: "08", name: "Август"}, {value: "09", name: "Сентябрь"},
        {value: "10", name: "Октябрь"}, {value: "11", name: "Ноябрь"}, {value: "12", name: "Декабрь"}
    ], []);

    if (loading && !isDateSet) {
        return <div className="container"><div className="loader"><div className="spinner"></div><p>Звезды выстраиваются для вас...</p></div></div>;
    }

    if (!isDateSet) {
        return (
            <div className="container">
                <h1 className="title">🔮 Ваш Гороскоп 🔮</h1>
                <div className="input-section">
                    <label className="input-label">Выберите вашу дату рождения:</label>
                    <div className="date-selectors">
                        <select value={date.day} onChange={e => setDate({...date, day: e.target.value})} aria-label="День"><option value="" disabled>День</option>{[...Array(31).keys()].map(i => <option key={i+1} value={i+1}>{i+1}</option>)}</select>
                        <select value={date.month} onChange={e => setDate({...date, month: e.target.value})} aria-label="Месяц"><option value="" disabled>Месяц</option>{months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select>
                        <select value={date.year} onChange={e => setDate({...date, year: e.target.value})} aria-label="Год"><option value="" disabled>Год</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                    </div>
                    <button onClick={() => getHoroscopes(date)} disabled={!date.day || !date.month || !date.year} className="submit-button">Войти</button>
                </div>
                {error && <p className="error-message">{error}</p>}
            </div>
        );
    }

    return (
        <div className="container">
            {zodiac && (
                <div className="header-section">
                    <h1 className="zodiac-title">{zodiac.sign} {zodiac.emoji}</h1>
                    <button onClick={handleDateChange} className="change-date-button">Сменить дату</button>
                </div>
            )}
            <UpdateInfo />
            {error && <p className="error-message">{error}</p>}
            {horoscopes && (
                <div className="horoscope-cards" ref={scrollContainerRef}>
                    {PERIODS.map(period => <HoroscopeCard key={period} title={period} horoscope={horoscopes[period]}/>)}
                </div>
            )}
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
