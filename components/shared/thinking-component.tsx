import { motion } from 'framer-motion'
import React from 'react'
import TypingDots from './typing-dots'

const ThnkingComponent = () => {
    return (
        <motion.div
            className="fixed bottom-8 mx-auto transform -translate-x-1/2 backdrop-blur-2xl bg-white/[0.02] rounded-full px-4 py-2 shadow-lg border border-white/[0.05]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
        >
            <div className="flex items-center gap-3">
                <div className="w-8 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-center">
                    {/* <span className="text-xs font-medium text-white/90 mb-0.5">
          zap
        </span> */}
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                    <span>Thinking</span>
                    <TypingDots />
                </div>
            </div>
        </motion.div>
    )
}

export default ThnkingComponent
