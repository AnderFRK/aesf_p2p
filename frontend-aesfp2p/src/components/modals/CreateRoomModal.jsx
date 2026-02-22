import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, VideoCameraIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

export default function CreateRoomModal({ isOpen, onClose, onCreate }) {
  const [roomName, setRoomName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
    if (!isOpen) setRoomName('');
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (roomName.trim().length > 0) {
      const cleanName = roomName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const randomCode = Math.random().toString(36).substring(2, 6);
      const finalRoomId = `${cleanName}-${randomCode}`;
      onCreate(finalRoomId);
      onClose();
    }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <VideoCameraIcon className="w-5 h-5 text-emerald-500" />
                Crear Nueva Sala
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors rounded-full p-1 hover:bg-gray-700">
                <XMarkIcon className="w-5 h-5" />
            </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6">
            <p className="text-sm text-gray-400 mb-4">
                Dale un nombre a tu sala. Se le añadirá un código único automáticamente.
            </p>

            <div className="relative mb-6">
                <input
                    ref={inputRef}
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Ej: Bajando pepa"
                    maxLength={30}
                    className="w-full bg-gray-900 border border-gray-600 text-white text-lg rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block p-4 shadow-inner transition-all"
                />
            </div>

            <div className="flex gap-3 justify-end">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={!roomName.trim()}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-lg shadow-emerald-900/20 flex items-center gap-2 font-bold transition-all active:scale-95"
                >
                    <PlusCircleIcon className="w-5 h-5" />
                    <span>Crear Sala</span>
                </button>
            </div>
        </form>

      </div>
    </div>
  );
}