/// <reference types="vite/client" />
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE SETUP ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- TYPES & CONSTANTS ---
type Horoscope = {
    period: string;
    summary: string;
    details: string;
    image_base64: string;
    sources: { uri: string; title: string }[];
    updated_at?: string;
};

// FIX: Add ZodiacSign type for better type safety.
type ZodiacSign = {
    name: string;
    symbol: string;
    start: number[];
    end: number[];
};

const ZODIAC_SIGNS: ZodiacSign[] = [
    { name: "Овен", symbol: "♈", start: [3, 21], end: [4, 19] },
    { name: "Телец", symbol: "♉", start: [4, 20], end: [5, 20] },
    { name: "Близнецы", symbol: "♊", start: [5, 21], end: [6, 20] },
    { name: "Рак", symbol: "♋", start: [6, 21], end: [7, 22] },
    { name: "Лев", symbol: "♌", start: [7, 23], end: [8, 22] },
    { name: "Дева", symbol: "♍", start: [8, 23], end: [9, 22] },
    { name: "Весы", symbol: "♎", start: [9, 23], end: [10, 22] },
    { name: "Скорпион", symbol: "♏", start: [10, 23], end: [11, 21] },
    { name: "Стрелец", symbol: "♐", start: [11, 22], end: [12, 21] },
    { name: "Козерог", symbol: "♑", start: [12, 22], end: [1, 19] },
    { name: "Водолей", symbol: "♒", start: [1, 20], end: [2, 18] },
    { name: "Рыбы", symbol: "♓", start: [2, 19], end: [3, 20] },
];

const PERIODS_ORDER = ['Вчера', 'Сегодня', 'Завтра', 'Неделю', 'Год'];

// --- HELPER FUNCTIONS ---
// FIX: Add return type annotation.
const getZodiacSign = (day: number, month: number): ZodiacSign | null => {
    for (const sign of ZODIAC_SIGNS) {
        const [startMonth, startDay] = sign.start;
        const [endMonth, endDay] = sign.end;
        if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
            return sign;
        }
    }
    // Handle Capricorn case which spans across years
    if (month === 12 && day >= 22 || month === 1 && day <= 19) {
        return ZODIAC_SIGNS.find(s => s.name === "Козерог")!;
    }
    return null;
};

const getDaysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();

// --- COMPONENTS ---

const UpdateInfo = () => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const intervalId = setInterval(() => {
            const now = new Date();
            const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));

            const nextUpdate = new Date(moscowTime);
            nextUpdate.setHours(24, 1, 0, 0); // Next day at 00:01

            const diff = nextUpdate.getTime() - moscowTime.getTime();

            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            
            setTimeLeft(`${String(hours).padStart(2, '0')} часов ${String(minutes).padStart(2, '0')} минут`);
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="update-info">
            <h4>Viht прогнозирует ваш гороскоп</h4>
            <div className="timer">До обновления: <strong>{timeLeft}</strong></div>
            <p className="update-logic">
                'Сегодня' и 'Завтра' обновляются ежедневно в 00:01 МСК. 'Неделя' — каждый Понедельник. 'Год' — первого числа месяца.
            </p>
        </div>
    );
};


const Loader = ({ text = "Звёзды выстраиваются для вас..." }) => (
    <div className="loader">
        <div className="spinner"></div>
        <p>{text}</p>
    </div>
);

const ErrorMessage = ({ message, onRetry }) => (
    <div className="container">
        <div className="error-message">{message}</div>
        {onRetry && <button onClick={onRetry} className="submit-button" style={{marginTop: '1rem'}}>Попробовать снова</button>}
    </div>
);

const HoroscopeCard = ({ horoscope, isLoading }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isFullyExpanded, setIsFullyExpanded] = useState(false);

    const toggleExpansion = () => setIsExpanded(!isExpanded);
    const toggleFullExpansion = () => setIsFullyExpanded(!isFullyExpanded);
    
    return (
        <div className="card">
            <button className="card-header" onClick={toggleExpansion} aria-expanded={isExpanded}>
                <h3>На {horoscope.period}</h3>
                <span>{isExpanded ? '-' : '+'}</span>
            </button>
            <div className={`card-content ${isExpanded ? 'expanded' : ''} ${isLoading ? 'loading' : ''}`}>
                {isLoading ? (
                    <div className="card-loader">
                        <div className="spinner"></div>
                        <p>Генерация...</p>
                    </div>
                ) : (
                    <div className="card-body">
                        {horoscope.image_base64 && <img src={horoscope.image_base64} alt={`Арт для гороскопа на ${horoscope.period}`} className="card-image" />}
                        <p className="card-summary">{horoscope.summary}</p>
                        
                        {horoscope.details && (
                             <>
                                <button onClick={toggleFullExpansion} className="read-more-button">
                                    {isFullyExpanded ? 'Свернуть' : 'Читать далее'}
                                </button>
                                <div className={`card-details-wrapper ${isFullyExpanded ? 'visible' : ''}`}>
                                    <p className="card-details">{horoscope.details}</p>
                                    {horoscope.sources && horoscope.sources.length > 0 && (
                                        <div className="card-sources">
                                            <h4>Источники</h4>
                                            <ul>
                                                {horoscope.sources.map(source => (
                                                    <li key={source.uri}><a href={source.uri} target="_blank" rel="noopener noreferrer">{source.title}</a></li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                             </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// FIX: Add types for component props to resolve type inference issues that cause the spread operator error.
type HoroscopeViewProps = {
    sign: ZodiacSign;
    horoscopes: Horoscope[];
    setBirthDate: (date: string | null) => void;
};

const HoroscopeView = ({ sign, horoscopes, setBirthDate }: HoroscopeViewProps) => {
    const cardsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const slider = cardsContainerRef.current;
        if (!slider) return;

        let isDown = false;
        let startX: number;
        let scrollLeft: number;

        const handleMouseDown = (e: MouseEvent) => {
            isDown = true;
            slider.classList.add('grabbing');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        };
        const handleMouseLeaveOrUp = () => {
            isDown = false;
            slider.classList.remove('grabbing');
        };
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
        };

        slider.addEventListener('mousedown', handleMouseDown);
        slider.addEventListener('mouseleave', handleMouseLeaveOrUp);
        slider.addEventListener('mouseup', handleMouseLeaveOrUp);
        slider.addEventListener('mousemove', handleMouseMove);

        return () => {
            slider.removeEventListener('mousedown', handleMouseDown);
            slider.removeEventListener('mouseleave', handleMouseLeaveOrUp);
            slider.removeEventListener('mouseup', handleMouseLeaveOrUp);
            slider.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);
    
    const sortedHoroscopes = useMemo(() => {
        const horoscopeMap = new Map(horoscopes.map(h => [h.period, h]));
        return PERIODS_ORDER.map(period => ({
            period,
            ...(horoscopeMap.get(period) || { summary: '', details: '', image_base64: '', sources: [] })
        }));
    }, [horoscopes]);

    return (
        <>
            <div className="header-section">
                <h1 className="zodiac-title">{sign.name} {sign.symbol}</h1>
                <button onClick={() => { localStorage.removeItem('birthDate'); setBirthDate(null); }} className="change-date-button">Сменить дату</button>
            </div>
            <UpdateInfo />
            <div className="horoscope-cards" ref={cardsContainerRef}>
                {sortedHoroscopes.map((horo, index) => (
                    <HoroscopeCard 
                        key={index} 
                        horoscope={horo as Horoscope}
                        isLoading={!horo.summary}
                    />
                ))}
            </div>
        </>
    );
};


const DateInput = ({ setBirthDate }) => {
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    const days = useMemo(() => {
        const numDays = (month && year) ? getDaysInMonth(parseInt(month), parseInt(year)) : 31;
        return Array.from({ length: numDays }, (_, i) => i + 1);
    }, [month, year]);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 100 }, (_, i) => currentYear - i);
    }, []);

    const months = [ "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь" ];
    
    const handleSubmit = () => {
        if (day && month && year) {
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            localStorage.setItem('birthDate', date);
            setBirthDate(date);
        }
    };

    return (
        <>
            <h1 className="title">Ваш Персональный Гороскоп</h1>
            <div className="input-section">
                <label className="input-label">Введите вашу дату рождения</label>
                <div className="date-selectors">
                    <select value={day} onChange={e => setDay(e.target.value)}><option value="">День</option>{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
                    <select value={month} onChange={e => setMonth(e.target.value)}><option value="">Месяц</option>{months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}</select>
                    <select value={year} onChange={e => setYear(e.target.value)}><option value="">Год</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                </div>
                <button onClick={handleSubmit} disabled={!day || !month || !year} className="submit-button">Узнать гороскоп</button>
            </div>
        </>
    );
};


const App = () => {
    const [birthDate, setBirthDate] = useState<string | null>(localStorage.getItem('birthDate'));
    // FIX: Use the specific ZodiacSign type instead of any.
    const [zodiacSign, setZodiacSign] = useState<ZodiacSign | null>(null);
    const [horoscopes, setHoroscopes] = useState<Horoscope[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!birthDate) {
            setLoading(false);
            return;
        }

        const [year, month, day] = birthDate.split('-').map(Number);
        const sign = getZodiacSign(day, month);
        setZodiacSign(sign);

        const fetchHoroscopes = async () => {
            if (!sign) return;
            setLoading(true);
            setError(null);
            setHoroscopes([]); // Clear old horoscopes
            try {
                const { data, error: functionError } = await supabase.functions.invoke('get-horoscope', {
                    body: { sign: sign.name },
                });

                if (functionError) throw functionError;
                if (!Array.isArray(data)) throw new Error("Получен некорректный ответ от сервера.");

                setHoroscopes(data);
            } catch (err: any) {
                console.error(err);
                setError(`Не удалось загрузить гороскоп: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchHoroscopes();
    }, [birthDate]);

    const renderContent = () => {
        if (loading) return <Loader />;
        if (error) return <ErrorMessage message={error} onRetry={() => setBirthDate(localStorage.getItem('birthDate'))} />;
        if (birthDate && zodiacSign) {
            return <HoroscopeView sign={zodiacSign} horoscopes={horoscopes} setBirthDate={setBirthDate} />;
        }
        return <DateInput setBirthDate={setBirthDate} />;
    };

    return (
        <div className="container">
            {renderContent()}
        </div>
    );
};

createRoot(document.getElementById('root')!).render(<App />);