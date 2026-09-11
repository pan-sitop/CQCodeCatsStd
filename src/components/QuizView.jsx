import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const QUESTION_BANK = [
    {
        question: "¿Qué etiqueta se usa para un párrafo?",
        options: ["<h1>", "<p>", "<a>", "<div>"],
        answer: 1,
    },
    {
        question: "¿Cuál es la etiqueta principal para un título muy grande?",
        options: ["<title>", "<header>", "<h1>", "<bold>"],
        answer: 2,
    },
    {
        question: "¿Cómo se hace un enlace a otra página?",
        options: ["<link>", "<a>", "<nav>", "<button>"],
        answer: 1,
    },
    {
        question: "Encuentra el error: <button>Haz click</buton>",
        options: ["El texto interior", "Falta el id", "Etiqueta mal cerrada", "No tiene href"],
        answer: 2,
    },
    {
        question: "¿Qué propiedad de CSS cambia el color del texto?",
        options: ["background-color", "color", "text-style", "font-color"],
        answer: 1,
    },
    {
        question: "¿Qué etiqueta crea una lista con viñetas (no ordenada)?",
        options: ["<ol>", "<ul>", "<li>", "<list>"],
        answer: 1,
    },
    {
        question: "¿Cuál es la forma correcta de insertar una imagen?",
        options: ["<img href='img.jpg'>", "<image src='img.jpg'>", "<img src='img.jpg'>", "<img>img.jpg</img>"],
        answer: 2,
    },
    {
        question: "¿Qué significa el acrónimo CSS?",
        options: ["Cascading Style Sheets", "Creative Style System", "Computer Style Sheets", "Colorive Style System"],
        answer: 0,
    },
    {
        question: "¿Cómo seleccionas un elemento por su ID en CSS?",
        options: [".mi-id", "*mi-id", "mi-id", "#mi-id"],
        answer: 3,
    },
    {
        question: "¿Cómo agregas un comentario en HTML5?",
        options: ["// Comentario", "/* Comentario */", "<!-- Comentario -->", "<!Comentario>"],
        answer: 2,
    },
    {
        question: "¿Qué propiedad de CSS cambia el color de fondo?",
        options: ["color", "back-color", "background-color", "bg-color"],
        answer: 2,
    },
    {
        question: "¿Qué atributo se usa para agregar estilos 'en línea'? (inline styles)",
        options: ["class", "css", "styles", "style"],
        answer: 3,
    },
    {
        question: "¿Cuál de estas NO es una etiqueta de formulario?",
        options: ["<input>", "<select>", "<form-input>", "<textarea>"],
        answer: 2,
    },
    {
        question: "¿Qué etiqueta se usa para resaltar texto en 'negrita' de forma semántica?",
        options: ["<strong>", "<bold>", "<b>", "<heavy>"],
        answer: 0,
    },
    {
        question: "¿A qué lenguaje se le conoce como 'El cerebro' o la interactividad de la web?",
        options: ["HTML", "Python", "JavaScript", "CSS"],
        answer: 2,
    }
];

export default function QuizView({ onReturnToStart, initialFinished = false }) {
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [showScore, setShowScore] = useState(false);
    const [isFinished, setIsFinished] = useState(initialFinished);
    const [selectedOption, setSelectedOption] = useState(null);
    const [feedback, setFeedback] = useState(null); // 'correct' | 'error' | null

    // Hidden tap logic for returning to start
    const tapCountRef = useRef(0);
    const tapTimerRef = useRef(null);
    const secretTapCountRef = useRef(0);
    const secretTapTimerRef = useRef(null);

    useEffect(() => {
        // Shuffle the bank and pick 10 questions
        const shuffledBank = [...QUESTION_BANK].sort(() => Math.random() - 0.5);
        const selected = shuffledBank.slice(0, 10).map(q => {
            // Shuffle the options within each question and correct the answer index
            const originalAnswerText = q.options[q.answer];
            const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
            const newAnswerIndex = shuffledOptions.indexOf(originalAnswerText);

            return {
                ...q,
                options: shuffledOptions,
                answer: newAnswerIndex
            };
        });
        setQuizQuestions(selected);
    }, []);

    const handleHiddenTap = (e) => {
        if (e.cancelable) e.preventDefault(); // Prevent double firing on touch + click

        tapCountRef.current += 1;

        if (tapCountRef.current === 1) {
            tapTimerRef.current = setTimeout(() => {
                tapCountRef.current = 0;
            }, 1000);
        }

        if (tapCountRef.current >= 3) {
            clearTimeout(tapTimerRef.current);
            tapCountRef.current = 0;
            console.log("Retorno oculto activado");
            onReturnToStart();
        }
    };

    const handleSecretTap = (e) => {
        if (e.cancelable) e.preventDefault();

        secretTapCountRef.current += 1;

        if (secretTapCountRef.current === 1) {
            secretTapTimerRef.current = setTimeout(() => {
                secretTapCountRef.current = 0;
            }, 1000);
        }

        if (secretTapCountRef.current >= 3) {
            clearTimeout(secretTapTimerRef.current);
            secretTapCountRef.current = 0;
            console.log("Easter egg dino activado!");
            confetti({
                particleCount: 200,
                spread: 120,
                origin: { y: 0.6 },
                colors: ['#4142F5', '#C3FB34'] // Logo colors
            });
            alert("¡Miau! Has encontrado el secreto de los michi-programadores 🐱💻");
        }
    };

    const handleAnswer = (optionIndex) => {
        if (feedback !== null) return; // Prevent multiple clicks

        setSelectedOption(optionIndex);
        const isCorrect = optionIndex === quizQuestions[currentQuestion].answer;

        if (isCorrect) {
            setFeedback('correct');
            triggerConfetti();
            setTimeout(() => {
                setFeedback(null);
                setSelectedOption(null);
                nextStep();
            }, 2000);
        } else {
            setFeedback('error');
            setTimeout(() => {
                setFeedback(null);
                setSelectedOption(null);
            }, 1500);
        }
    };

    const nextStep = () => {
        if (currentQuestion < quizQuestions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            setIsFinished(true);
        }
    };

    const triggerConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#C3FB34', '#4142F5']
        });
    };

    if (isFinished) {
        return (
            <motion.div
                className="w-full h-full py-16 md:py-12 flex flex-col items-center justify-start md:justify-center p-6 md:p-8 pointer-events-auto z-50 text-center overflow-y-auto overflow-x-hidden custom-scrollbar"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Hidden button for triggering return */}
                <div
                    className="absolute top-0 right-0 w-[80px] h-[80px] opacity-0 cursor-pointer z-50"
                    onClick={handleHiddenTap}
                    onTouchEnd={handleHiddenTap}
                    title="Triple Tap to Return"
                />

                <h2 className="font-ryker font-black text-5xl md:text-6xl lg:text-7xl text-azul-gatuno mb-12 tracking-widest uppercase drop-shadow-sm max-w-[90%] md:max-w-5xl text-balance">¡SÍGUENOS EN NUESTRAS REDES!</h2>

                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 w-full max-w-5xl mt-4">
                    <motion.div
                        className="relative z-10 flex-1 flex justify-center md:justify-end mt-6 md:mt-0"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.8 }}
                    >
                        <img
                            src="/cat-lap.svg"
                            alt="Gato con laptop"
                            className="w-full max-w-[200px] sm:max-w-xs md:max-w-sm h-auto object-contain drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform"
                            onError={(e) => { e.target.src = 'https://placehold.co/350x350/fff/42b883?text=Cat+Lap'; }}
                            onClick={handleSecretTap}
                            onTouchEnd={handleSecretTap}
                        />
                    </motion.div>

                    <div className="flex-1 flex justify-center md:justify-start w-full">
                        <div className="bg-white p-6 md:p-8 shadow-2xl rounded-[2.5rem] border-4 border-verde-limon relative flex flex-col items-center justify-center group cursor-pointer hover:scale-105 transition-transform duration-300 w-full max-w-sm">
                            <a href="https://linktr.ee/code_cats_studio" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center w-full">
                                <span className="font-ryker text-azul-gatuno text-lg md:text-xl mb-4 md:mb-6 font-black tracking-widest uppercase bg-cyan-100 px-4 py-2 md:px-6 md:py-3 rounded-full group-hover:bg-verde-limon group-hover:text-gray-900 transition-colors shadow-sm text-center">
                                    ¡Escanea o haz clic!
                                </span>
                                <div className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] md:w-[260px] md:h-[260px] aspect-square flex items-center justify-center">
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=https://linktr.ee/code_cats_studio&color=4142F5" alt="QR Code Linktree" className="w-full h-full object-contain" />
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (quizQuestions.length === 0) {
        return <div className="min-h-screen w-full flex items-center justify-center text-2xl font-ryker text-azul-gatuno">Cargando...</div>;
    }

    const shakeAnimation = feedback === 'error' ? { x: [-10, 10, -10, 10, -10, 0] } : {};

    // Wait for the questions to be ready
    if (quizQuestions.length === 0) {
        return null;
    }

    return (
        <motion.div
            className="w-full flex-grow min-h-screen py-8 md:py-12 flex items-center justify-center p-4 md:p-8 pointer-events-auto"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
        >
            <div className="relative w-full max-w-4xl flex flex-col items-center mt-12">

                {/* Cat Top (Asomándose) */}
                <img
                    src="/imgs/cat-quiz-top.png"
                    alt="Michi mirando"
                    className="w-64 md:w-80 h-auto object-contain z-30 -mb-12 drop-shadow-lg relative pointer-events-none"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />

                <motion.div
                    className="w-full bg-white shadow-2xl rounded-[2.5rem] p-6 md:p-10 text-center relative flex flex-col items-center z-20"
                    animate={shakeAnimation}
                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                >
                    <div className="font-ryker text-azul-gatuno/70 mb-3 text-lg md:text-xl tracking-widest uppercase font-bold">
                        Pregunta {currentQuestion + 1} de {quizQuestions.length}
                    </div>

                    <h2 className="font-ryker font-black text-2xl md:text-3xl text-azul-gatuno mb-6 md:mb-8 drop-shadow-sm leading-tight max-w-[100%] md:max-w-[90%] uppercase">
                        {quizQuestions[currentQuestion].question}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full mb-2 md:mb-4">
                        {quizQuestions[currentQuestion].options.map((opt, idx) => {
                            let buttonClasses = "py-3 md:py-4 px-4 md:px-6 rounded-2xl bg-white text-lg md:text-2xl font-camingo text-azul-gatuno border-border-azul border-[3px] md:border-4 border-transparent hover:border-azul-gatuno hover:bg-cian-brillante/10 transition-all shadow-md focus:outline-none";

                            // Apply feedback styling if this option is selected
                            if (feedback !== null && selectedOption === idx) {
                                if (feedback === 'correct') {
                                    buttonClasses = "py-3 md:py-4 px-4 md:px-6 rounded-2xl bg-green-50 text-lg md:text-2xl font-camingo text-green-700 border-[3px] md:border-4 border-green-500 shadow-md focus:outline-none transition-all";
                                } else if (feedback === 'error') {
                                    buttonClasses = "py-3 md:py-4 px-4 md:px-6 rounded-2xl bg-red-50 text-lg md:text-2xl font-camingo text-red-700 border-[3px] md:border-4 border-red-500 shadow-md focus:outline-none transition-all";
                                }
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    disabled={feedback !== null}
                                    className={buttonClasses}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Left Error Cat */}
                <AnimatePresence>
                    {feedback === 'error' && (
                        <motion.img
                            src="/imgs/cat-error.png"
                            alt="Error Michi Izquierdo"
                            className="absolute -left-12 md:-left-32 lg:-left-44 top-1/2 -mt-12 md:-mt-16 w-24 md:w-32 h-auto object-contain z-10 pointer-events-none drop-shadow-md"
                            initial={{ opacity: 0, y: 250 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 250 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    )}
                </AnimatePresence>

                {/* Right Error Cat */}
                <AnimatePresence>
                    {feedback === 'error' && (
                        <motion.img
                            src="/imgs/cat-error.png"
                            alt="Error Michi Derecho"
                            className="absolute -right-12 md:-right-32 lg:-right-44 top-1/2 -mt-12 md:-mt-16 w-24 md:w-32 h-auto object-contain z-10 pointer-events-none drop-shadow-md -scale-x-100" // scale-x-100 flips it horizontally
                            initial={{ opacity: 0, y: 250 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 250 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    )}
                </AnimatePresence>

                {/* Cat Paws (Patitas colgando) */}
                <img
                    src="/imgs/cat-quiz-paws.png"
                    alt="Patitas de michi"
                    className="w-48 md:w-64 h-auto object-contain z-10 -mt-3 drop-shadow-lg relative pointer-events-none"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
            </div>
        </motion.div>
    );
}