import { useState, useEffect, useRef } from 'react';
import { VideoCameraIcon, MicrophoneIcon } from '@heroicons/react/24/outline';

export default function HardwareTab() {
  const [devices, setDevices] = useState({ video: [], audio: [] });
  const [selectedVideo, setSelectedVideo] = useState(localStorage.getItem('aesf_cam_id') || '');
  const [selectedAudio, setSelectedAudio] = useState(localStorage.getItem('aesf_mic_id') || '');
  
  const [previewStream, setPreviewStream] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        
        const videoInputs = deviceList.filter(d => d.kind === 'videoinput');
        const audioInputs = deviceList.filter(d => d.kind === 'audioinput');

        setDevices({ video: videoInputs, audio: audioInputs });

        if (!selectedVideo && videoInputs.length > 0) setSelectedVideo(videoInputs[0].deviceId);
        if (!selectedAudio && audioInputs.length > 0) setSelectedAudio(audioInputs[0].deviceId);

        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("Permisos de hardware denegados:", err);
      }
    };
    getDevices();
  }, [selectedAudio, selectedVideo]);

  useEffect(() => {
    if (!selectedVideo) return;

    const startPreview = async () => {
      try {
        if (previewStream) previewStream.getTracks().forEach(t => t.stop());

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedVideo } }
        });
        
        setPreviewStream(stream);
        if (videoRef.current) videoRef.current.srcObject = stream;
        
        localStorage.setItem('aesf_cam_id', selectedVideo);
      } catch (err) {
        console.error("Error en vista previa:", err);
      }
    };

    startPreview();

    return () => {
      if (previewStream) previewStream.getTracks().forEach(t => t.stop());
    };
  }, [selectedVideo]);

  const handleAudioChange = (e) => {
    const id = e.target.value;
    setSelectedAudio(id);
    localStorage.setItem('aesf_mic_id', id);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Configuración de Hardware</h2>
        <p className="text-gray-400">Selecciona los dispositivos que usarás para tus videollamadas.</p>
      </div>

      <section className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <VideoCameraIcon className="w-6 h-6 text-emerald-500" />
          <h3 className="text-lg font-semibold text-white">Cámara</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-400">Dispositivo de Video</label>
            <select
              value={selectedVideo}
              onChange={(e) => setSelectedVideo(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500"
            >
              {devices.video.length === 0 && <option>No se detectaron cámaras</option>}
              {devices.video.map(cam => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Cámara ${cam.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-black rounded-xl overflow-hidden aspect-video border border-gray-700 flex items-center justify-center relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            {!previewStream && (
                <span className="text-gray-500 text-sm absolute">Cargando vista previa...</span>
            )}
          </div>
        </div>
      </section>

      <section className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MicrophoneIcon className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-white">Micrófono</h3>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-400">Dispositivo de Audio</label>
          <select
            value={selectedAudio}
            onChange={handleAudioChange}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"
          >
            {devices.audio.length === 0 && <option>No se detectaron micrófonos</option>}
            {devices.audio.map(mic => (
              <option key={mic.deviceId} value={mic.deviceId}>
                {mic.label || `Micrófono ${mic.deviceId.slice(0, 5)}...`}
              </option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );
}