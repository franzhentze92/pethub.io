import React, { useState, useEffect } from 'react';
import { Heart, Star, Zap, Smile, Frown, Droplets, Coffee } from 'lucide-react';
import { PetAvatar } from '@/components/PetAvatar';
import { cn } from '@/lib/utils';
import { formatSpeciesLabel } from '@/utils/petLabels';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  image_url?: string;
}

interface PetHeroProps {
  pet: Pet;
  mood?: 'happy' | 'hungry' | 'tired' | 'excited' | 'sad';
  level?: number;
  happiness?: number;
  onPetClick?: () => void;
}

const PetHero: React.FC<PetHeroProps> = ({ 
  pet, 
  mood = 'happy', 
  level = 1, 
  happiness = 85,
  onPetClick 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showMoodBubble, setShowMoodBubble] = useState(true);

  const getMoodMessage = () => {
    const messages = {
      happy: [
        `¡Hola! Soy ${pet.name} y estoy muy feliz! 🐾`,
        `¡Me encanta estar contigo, ${pet.name} aquí! 💕`,
        `¡Qué día tan bonito! ¿Jugamos? 🎾`,
        `¡Estoy listo para cualquier aventura! ⚡`
      ],
      hungry: [
        `¡Hola! Tengo hambre 🍖`,
        `¿Podrías darme algo de comer? 😋`,
        `¡Mi barriguita hace ruido! 🍽️`,
        `¿Es hora de comer? Estoy esperando... 🕐`
      ],
      tired: [
        `¡Hola! Estoy un poco cansado 😴`,
        `Creo que necesito una siesta... 💤`,
        `¿Podemos relajarnos un poco? 🛋️`,
        `¡Qué día tan largo! Estoy agotado 😪`
      ],
      excited: [
        `¡Hola! ¡Estoy súper emocionado! 🎉`,
        `¡No puedo contener mi energía! ⚡`,
        `¡Vamos a hacer algo divertido! 🎮`,
        `¡Estoy rebosando de felicidad! ✨`
      ],
      sad: [
        `Hola... me siento un poco triste 😔`,
        `¿Podrías darme un abrazo? 🤗`,
        `Necesito un poco de cariño... 💔`,
        `¿Podemos pasar tiempo juntos? 🥺`
      ]
    };
    
    const moodMessages = messages[mood];
    return moodMessages[Math.floor(Math.random() * moodMessages.length)];
  };

  const getMoodIcon = () => {
    switch (mood) {
      case 'happy': return <Smile className="w-5 h-5 text-yellow-500" />;
      case 'hungry': return <Coffee className="w-5 h-5 text-orange-500" />;
      case 'tired': return <Frown className="w-5 h-5 text-blue-500" />;
      case 'excited': return <Zap className="w-5 h-5 text-purple-500" />;
      case 'sad': return <Frown className="w-5 h-5 text-gray-500" />;
      default: return <Smile className="w-5 h-5 text-green-500" />;
    }
  };

  const getMoodColor = () => {
    switch (mood) {
      case 'happy': return 'from-green-400 to-emerald-500';
      case 'hungry': return 'from-orange-400 to-red-500';
      case 'tired': return 'from-blue-400 to-indigo-500';
      case 'excited': return 'from-purple-400 to-pink-500';
      case 'sad': return 'from-gray-400 to-slate-500';
      default: return 'from-green-400 to-emerald-500';
    }
  };

  const handlePetClick = () => {
    setIsAnimating(true);
    if (onPetClick) {
      onPetClick();
    }
    
    // Reset animation after 1 second
    setTimeout(() => {
      setIsAnimating(false);
    }, 1000);
  };

  // Auto-hide mood bubble after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMoodBubble(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [mood]);

  return (
    <div className="relative">
      {/* Mood Bubble */}
      {showMoodBubble && (
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 z-10">
          <div className={`
            bg-gradient-to-r ${getMoodColor()} text-white px-4 py-2 rounded-full 
            shadow-lg animate-bounce
          `}>
            <div className="flex items-center space-x-2">
              {getMoodIcon()}
              <span className="text-sm font-medium whitespace-nowrap">
                {getMoodMessage()}
              </span>
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-current"></div>
          </div>
        </div>
      )}

      {/* Pet Display */}
      <div className="relative">
        {/* Pet Container */}
        <div 
          className={`
            relative w-48 h-48 mx-auto cursor-pointer transition-all duration-300
            ${isAnimating ? 'scale-110' : 'hover:scale-105'}
          `}
          onClick={handlePetClick}
        >
          {/* Pet Image */}
          <div className="relative w-full h-full">
            <PetAvatar
              pet={pet}
              size="hero"
              className={cn(
                'w-full h-full border-4 border-white shadow-2xl transition-all duration-500',
                isAnimating ? 'animate-pulse' : '',
              )}
            />
            
            {/* Level Badge */}
            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
              <span className="text-sm font-bold">{level}</span>
            </div>
            
            {/* Happiness Indicator */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center space-x-1 bg-white rounded-full px-3 py-1 shadow-lg">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-gray-700">{happiness}%</span>
              </div>
            </div>
          </div>
          
          {/* Sparkle Effects */}
          {mood === 'happy' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 text-yellow-400 animate-ping">
                <Star className="w-3 h-3" />
              </div>
              <div className="absolute top-8 right-6 text-yellow-400 animate-ping" style={{ animationDelay: '0.5s' }}>
                <Star className="w-2 h-2" />
              </div>
              <div className="absolute bottom-6 left-6 text-yellow-400 animate-ping" style={{ animationDelay: '1s' }}>
                <Star className="w-2 h-2" />
              </div>
            </div>
          )}
          
          {/* Hungry Droplets */}
          {mood === 'hungry' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                <Droplets className="w-4 h-4 text-orange-500 animate-bounce" />
              </div>
            </div>
          )}
        </div>
        
        {/* Pet Info */}
        <div className="text-center mt-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {pet.name}
          </h2>
          <p className="text-gray-600">
            {formatSpeciesLabel(pet.species)} • {pet.breed && `${pet.breed} •`} Nivel {level}
          </p>
          
          {/* Happiness Bar */}
          <div className="mt-3 max-w-xs mx-auto">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Felicidad</span>
              <span>{happiness}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`
                  h-2 rounded-full transition-all duration-1000
                  ${happiness >= 80 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                    happiness >= 60 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                    happiness >= 40 ? 'bg-gradient-to-r from-orange-400 to-red-500' :
                    'bg-gradient-to-r from-red-400 to-red-600'}
                `}
                style={{ width: `${happiness}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetHero;
