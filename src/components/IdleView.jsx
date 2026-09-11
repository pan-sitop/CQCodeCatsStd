import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const CAROUSEL_ITEMS = [
    { title: "Misión", text: "Hackeando el aprendizaje de forma creativa" },
    { title: "Visión", text: "Un michi-programador en cada rincón tecnológico" },
    { title: "Objetivos", text: "Aprender, Construir, Compartir" }
];

export default function IdleView({ onProceed, onGoToGame, onGoToRedes }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const tapCountRef = useRef(0);
    const tapTimerRef = useRef(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % CAROUSEL_ITEMS.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    const handleLogoTap = (e) => {
        if (e.cancelable) e.preventDefault(); // Prevent double firing on touch + click

        tapCountRef.current += 1;

        if (tapCountRef.current === 1) {
            // Start the 1-second timer on the first tap
            tapTimerRef.current = setTimeout(() => {
                tapCountRef.current = 0;
            }, 1000);
        }

        if (tapCountRef.current >= 3) {
            clearTimeout(tapTimerRef.current);
            tapCountRef.current = 0;
            console.log("Easter egg activado!");
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#4142F5', '#C3FB34']
            });
            // Show a quick alert dynamically (or we could use state for a fancy modal, 
            // but an alert is simple for leaders)
            alert("¡Miau! Has encontrado el secreto de los michi-programadores 🐱💻");
        }
    };

    return (
        <motion.div
            className="w-full flex-grow min-h-screen py-12 flex flex-col items-center justify-center pointer-events-auto overflow-x-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8 }}
        >
            <div className="flex flex-col md:flex-row items-center justify-center max-w-6xl mx-auto px-6 md:px-8 gap-8 md:gap-16 z-10 w-full relative py-12 md:py-0">
                <motion.div
                    className="w-48 h-48 md:w-[400px] md:h-[400px] flex-shrink-0 relative drop-shadow-2xl cursor-pointer"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    onClick={handleLogoTap}
                    onTouchEnd={handleLogoTap}
                    title="Code Cats Logo (Click me!)"
                >
                    {/* We assume the images are in public/imgs */}
                    <img
                        src="/imgs/cat-logo.png"
                        alt="Cat Logo"
                        className="w-full h-full object-contain"
                        onError={(e) => { e.target.src = 'https://placehold.co/400x400/fff/4142F5?text=Michi'; }}
                    />
                </motion.div>

                <div className="flex-1 min-h-[300px] md:min-h-[250px] text-center md:text-left flex flex-col justify-center items-center md:items-start relative w-full">
                    <div className="relative w-full h-[120px] md:h-[150px] mb-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5 }}
                                className="absolute w-full"
                            >
                                <h2 className="font-ryker text-4xl md:text-6xl lg:text-7xl text-azul-gatuno mb-4 md:mb-6 uppercase tracking-wider !font-black drop-shadow-sm text-balance">
                                    {CAROUSEL_ITEMS[currentIndex].title}
                                </h2>
                                <p className="font-camingo text-xl md:text-2xl lg:text-3xl text-azul-gatuno leading-relaxed font-semibold text-pretty">
                                    {CAROUSEL_ITEMS[currentIndex].text}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 w-full sm:w-auto px-4 md:px-0">
                        <button
                            onClick={onProceed}
                            className="w-full sm:w-auto px-6 py-4 rounded-full font-geomanist font-bold text-lg uppercase tracking-widest bg-azul-gatuno text-white shadow-[0_0_15px_rgba(65,66,245,0.6)] hover:shadow-[0_0_25px_rgba(195,251,52,0.8)] hover:bg-verde-limon hover:text-gray-900 transition-all duration-300 flex items-center justify-center whitespace-nowrap"
                        >
                            Empezar
                        </button>
                        <button
                            onClick={onGoToGame}
                            className="w-full sm:w-auto px-6 py-4 rounded-full font-geomanist font-bold text-lg uppercase tracking-widest bg-white text-azul-gatuno ring-4 ring-inset ring-azul-gatuno shadow-md hover:bg-azul-gatuno hover:text-white transition-all duration-300 flex items-center justify-center whitespace-nowrap"
                        >
                            Juegos
                        </button>
                        <button
                            onClick={onGoToRedes}
                            className="w-full sm:w-auto px-6 py-4 rounded-full font-geomanist font-bold text-lg uppercase tracking-widest bg-azul-gatuno text-white shadow-[0_0_15px_rgba(65,66,245,0.6)] hover:shadow-[0_0_25px_rgba(195,251,52,0.8)] hover:bg-verde-limon hover:text-gray-900 transition-all duration-300 flex items-center justify-center whitespace-nowrap"
                        >
                            Redes
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
