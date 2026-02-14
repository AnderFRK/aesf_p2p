import { useState, useEffect, useRef } from 'react';

export default function DraggableWindow({ children, isExpanded }) {
  // Posición inicial: Esquina inferior derecha
  const [position, setPosition] = useState({ 
    x: window.innerWidth - 340, 
    y: window.innerHeight - 300 
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 }); 

  const style = isExpanded
    ? { 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: 50,
        borderRadius: 0,
        transition: 'all 0.3s ease-in-out'
      }
    : { 
        position: 'fixed', 
        top: position.y, 
        left: position.x, 
        width: '320px', 
        height: 'auto', 
        zIndex: 50,
        borderRadius: '0.5rem',
        transition: isDragging ? 'none' : 'top 0.3s cubic-bezier(0.25, 1, 0.5, 1), left 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
      };

  const handleMouseDown = (e) => {
    if (isExpanded) return;
    if (!e.target.closest('.drag-handle')) return;

    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y
    });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    snapToCorner(); // IMÁN A ESQUINAS
  };

  // --- LÓGICA DE LOS 4 CUADRANTES ---
  const snapToCorner = () => {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const myW = 320; // Ancho de la ventana
    // Estimamos la altura o usamos una referencia, aquí usaremos un aprox seguro
    const myH = 300; 
    const margin = 16; // Margen de separación del borde

    let { x, y } = position;

    // 1. Calcular el centro de la ventana flotante
    const centerX = x + (myW / 2);
    const centerY = y + (myH / 2);

    // 2. Decidir Horizontal (Izquierda vs Derecha)
    if (centerX < winW / 2) {
        x = margin; // Pegar a Izquierda
    } else {
        x = winW - myW - margin; // Pegar a Derecha
    }

    // 3. Decidir Vertical (Arriba vs Abajo)
    if (centerY < winH / 2) {
        y = margin; // Pegar Arriba
    } else {
        y = winH - myH - margin; // Pegar Abajo
    }

    setPosition({ x, y });
  };

  // Listeners globales
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]);

  useEffect(() => {
     const handleResize = () => snapToCorner();
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={style}
      className={`bg-gray-900 border border-gray-600 shadow-2xl overflow-hidden flex flex-col ${isDragging ? 'cursor-grabbing border-emerald-500/50 scale-[1.02]' : ''}`}
    >
      {children}
    </div>
  );
}