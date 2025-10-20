/// <reference types="vite/client" />

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE SETUP ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided in .env file");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- TYPES ---
type ZodiacSign = {
    name: string;
    symbol: string;
};

type Horoscope = {
    period: string;
    summary?: string;
    details?: string;
    image_base64?: string;
    sources?: { uri: string; title: string }[];
    updated_at?: string;
};

type HoroscopeCardState = Horoscope & {
    status: 'loading' | 'loaded' | 'error';
};

// --- CONSTANTS ---
const ZODIAC_SIGNS: Record<string, ZodiacSign> = {
    'Овен': { name: 'Овен', symbol: '♈' },
    'Телец': { name: 'Телец', symbol: '♉' },
    'Близнецы': { name: 'Близнецы', symbol: '♊' },
    'Рак': { name: 'Рак', symbol: '♋' },
    'Лев': { name: 'Лев', symbol: '♌' },
    'Дева': { name: 'Дева', symbol: '♍' },
    'Весы': { name: 'Весы', symbol: '♎' },
    'Скорпион': { name: 'Скорпион', symbol: '♏' },
    'Стрелец': { name: 'Стрелец', symbol: '♐' },
    'Козерог': { name: 'Козерог', symbol: '♑' },
    'Водолей': { name: 'Водолей', symbol: '♒' },
    'Рыбы': { name: 'Рыбы', symbol: '♓' },
};

const PERIODS = ['Вчера', 'Сегодня', 'Завтра', 'Неделю', 'Год'];

const getZodiacSign = (day: number, month: number): ZodiacSign => {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return ZODIAC_SIGNS['Овен'];
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return ZODIAC_SIGNS['Телец'];
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return ZODIAC_SIGNS['Близнецы'];
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return ZODIAC_SIGNS['Рак'];
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return ZODIAC_SIGNS['Лев'];
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return ZODIAC_SIGNS['Дева'];
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return ZODIAC_SIGNS['Весы'];
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return ZODIAC_SIGNS['Скорпион'];
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return ZODIAC_SIGNS['Стрелец'];
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return ZODIAC_SIGNS['Козерог'];
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return ZODIAC_SIGNS['Водолей'];
    return ZODIAC_SIGNS['Рыбы'];
};

// --- COMPONENTS ---
const DateSelector: React.FC<{ onDateSubmit: (sign: ZodiacSign) => void }> = ({ onDateSubmit }) => {
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    const handleLogin = () => {
        if (day && month && year) {
            localStorage.setItem('birthDate', JSON.stringify({ day, month, year }));
            const sign = getZodiacSign(parseInt(day), parseInt(month));
            onDateSubmit(sign);
        }
    };

    return (
        <div className="input-section">
            <h1 className="title">Ваш космический гид</h1>
            <label className="input-label">Укажите вашу дату рождения:</label>
            <div className="date-selectors">
                <select value={day} onChange={(e) => setDay(e.target.value)} aria-label="День">
                    <option value="">День</option>
                    {[...Array(31)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select>
                <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Месяц">
                    <option value="">Месяц</option>
                    {['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'].map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
                <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Год">
                    <option value="">Год</option>
                    {[...Array(100)].map((_, i) => <option key={2023 - i} value={2023 - i}>{2023 - i}</option>)}
                </select>
            </div>
            <button className="submit-button" onClick={handleLogin} disabled={!day || !month || !year}>
                Узнать судьбу
            </button>
        </div>
    );
};

const HoroscopeCard: React.FC<{ horoscope: HoroscopeCardState }> = ({ horoscope }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isFullyExpanded, setIsFullyExpanded] = useState(false);

    if (horoscope.status === 'error') {
        return (
             <div className="card">
                <div className="card-header"><h3>На {horoscope.period}</h3></div>
                <div className="card-content expanded">
                    <div className="card-body">
                        <p className="card-summary">Не удалось загрузить предсказание. Попробуйте обновить страницу позже.</p>
                    </div>
                </div>
            </div>
        )
    }

    if (horoscope.status === 'loading' || !horoscope.summary) {
        return (
            <div className="card">
                <div className="card-header"><h3>На {horoscope.period}</h3></div>
                <div className="card-content loading expanded">
                    <div className="card-loader">
                        <div className="spinner"></div>
                        <p>Звезды шепчутся...</p>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="card">
            <div className="card-header" onClick={() => setIsExpanded(!isExpanded)}>
                <h3>На {horoscope.period}</h3>
                <span>{isExpanded ? '-' : '+'}</span>
            </div>
            <div className={`card-content ${isExpanded ? 'expanded' : ''}`}>
                <div className="card-body">
                    {horoscope.image_base64 && <img src={horoscope.image_base64} alt={`Арт для ${horoscope.period}`} className="card-image" />}
                    <p className="card-summary">{horoscope.summary}</p>
                    
                    {!isFullyExpanded && (
                        <button className="read-more-button" onClick={() => setIsFullyExpanded(true)}>Читать далее →</button>
                    )}

                    <div className={`card-details-wrapper ${isFullyExpanded ? 'visible' : ''}`}>
                        <p className="card-details">{horoscope.details}</p>
                        {horoscope.sources && horoscope.sources.length > 0 && (
                            <div className="card-sources">
                                <h4>Источники:</h4>
                                <ul>
                                    {horoscope.sources.map(source => (
                                        <li key={source.uri}><a href={source.uri} target="_blank" rel="noopener noreferrer">{source.title}</a></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


const UpdateInfo: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
            
            const nextUpdate = new Date(moscowTime);
            nextUpdate.setDate(moscowTime.getDate() + 1);
            nextUpdate.setHours(0, 1, 0, 0);

            const diff = nextUpdate.getTime() - moscowTime.getTime();
            
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            
            setTimeLeft(`${String(hours).padStart(2, '0')} часов ${String(minutes).padStart(2, '0')} минут`);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="update-info">
            <h4>Viht прогнозирует ваш гороскоп</h4>
            <div className="timer">До обновления: <strong>{timeLeft}</strong></div>
            <div className="update-logic">
                'Сегодня' и 'Завтра' обновляются ежедневно в 00:01 МСК. 'Неделя' — каждый Понедельник. 'Год' — первого числа месяца.
            </div>
        </div>
    );
};


const HoroscopeView: React.FC<{ sign: ZodiacSign; onChangeDate: () => void }> = ({ sign, onChangeDate }) => {
    const [horoscopes, setHoroscopes] = useState<HoroscopeCardState[]>([]);
    const cardsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchSequentially = async () => {
            // Устанавливаем начальное состояние загрузки для всех карточек
            setHoroscopes(PERIODS.map(p => ({ period: p, status: 'loading' })));

            for (const period of PERIODS) {
                try {
                    const { data, error } = await supabase.functions.invoke('get-horoscope', {
                        body: { sign: sign.name, period },
                    });

                    if (error) throw new Error(`Функция вернула ошибку: ${error.message}`);
                    if (!data) throw new Error("Функция не вернула данные");

                    // Обновляем состояние для только что загруженной карточки
                    setHoroscopes(prev => prev.map(h => 
                        h.period === period ? { ...data, status: 'loaded' } : h
                    ));
                    
                } catch (e: any) {
                    console.error(`Не удалось загрузить гороскоп на ${period}:`, e);
                    // Обновляем состояние для карточки, которая не загрузилась
                     setHoroscopes(prev => prev.map(h => 
                        h.period === period ? { period: period, status: 'error' } : h
                    ));
                }
            }
        };

        fetchSequentially();
    }, [sign]);

    useEffect(() => {
        const slider = cardsContainerRef.current;
        if (!slider) return;

        let isDown = false;
        let startX: number;
        let scrollLeft: number;

        const start = (e: MouseEvent | TouchEvent) => {
            isDown = true;
            slider.classList.add('grabbing');
            startX = (e instanceof MouseEvent ? e.pageX : e.touches[0].pageX) - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        };

        const end = () => {
            isDown = false;
            slider.classList.remove('grabbing');
        };

        const move = (e: MouseEvent | TouchEvent) => {
            if (!isDown) return;
            e.preventDefault();
            const x = (e instanceof MouseEvent ? e.pageX : e.touches[0].pageX) - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
        };
        
        slider.addEventListener('mousedown', start);
        slider.addEventListener('mouseleave', end);
        slider.addEventListener('mouseup', end);
        slider.addEventListener('mousemove', move);

        slider.addEventListener('touchstart', start);
        slider.addEventListener('touchend', end);
        slider.addEventListener('touchmove', move);

        return () => {
            slider.removeEventListener('mousedown', start);
            slider.removeEventListener('mouseleave', end);
            slider.removeEventListener('mouseup', end);
            slider.removeEventListener('mousemove', move);
            slider.removeEventListener('touchstart', start);
            slider.removeEventListener('touchend', end);
            slider.removeEventListener('touchmove', move);
        };
    }, []);

    return (
        <>
            <div className="header-section">
                <h2 className="zodiac-title">{sign.name} {sign.symbol}</h2>
                <button className="change-date-button" onClick={onChangeDate}>Сменить дату</button>
            </div>
            <UpdateInfo />
            <div className="horoscope-cards" ref={cardsContainerRef}>
                {horoscopes.map((horoscope, index) => (
                    <HoroscopeCard key={index} horoscope={horoscope} />
                ))}
            </div>
        </>
    );
};

const App = () => {
    const [zodiacSign, setZodiacSign] = useState<ZodiacSign | null>(null);

    useEffect(() => {
        const savedDate = localStorage.getItem('birthDate');
        if (savedDate) {
            const { day, month } = JSON.parse(savedDate);
            setZodiacSign(getZodiacSign(parseInt(day), parseInt(month)));
        }
    }, []);

    const handleChangeDate = () => {
        localStorage.removeItem('birthDate');
        setZodiacSign(null);
    };

    return (
        <div className="container">
            {zodiacSign ? (
                <HoroscopeView sign={zodiacSign} onChangeDate={handleChangeDate} />
            ) : (
                <DateSelector onDateSubmit={setZodiacSign} />
            )}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
