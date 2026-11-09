import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { API, CHAT_SERVER_URL } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Pill from '../components/Pill.jsx';
import Alert from '../components/Alert.jsx';
import { fmtDateTime, statusLabel } from '../lib/helpers.js';
import { chatMessageVariants, staggerContainer, staggerItem } from '../lib/animations.js';
import {
    MessageIcon, AlertIcon, StethoscopeIcon, PillIcon, HospitalIcon, NoteIcon,
    VideoIcon, VideoOffIcon, MicIcon, MicOffIcon,
} from '../components/Icons.jsx';

const TRIAGE_MSG = {
    refer:   'Red-flag symptoms detected. In-person referral strongly recommended.',
    review:  'Doctor should review carefully. Remote prescription possible with caution.',
    routine: 'Symptoms appear suitable for remote prescription.',
};

// STUN lets the two browsers discover a route to each other. A TURN server can
// be supplied for restrictive mobile networks without changing the call flow.
const RTC_CONFIG = {
    iceServers: [
        { urls: import.meta.env.VITE_STUN_URL || 'stun:stun.l.google.com:19302' },
        ...(import.meta.env.VITE_TURN_URL ? [{
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME || undefined,
            credential: import.meta.env.VITE_TURN_CREDENTIAL || undefined,
        }] : []),
    ],
    iceCandidatePoolSize: 4,
};
const MANUAL_DRUG_VALUE = '__manual__';
const MEDICINE_FORMS = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'other'];
const PREVIEW_SIZE_KEY = 'telemed_video_preview_size';
const PREVIEW_SIZE_MIN = 96;
const PREVIEW_SIZE_MAX = 220;

function clampPreviewSize(value) {
    if (value === null || value === undefined || value === '') return 144;
    const next = Number(value);
    if (!Number.isFinite(next)) return 144;
    return Math.min(PREVIEW_SIZE_MAX, Math.max(PREVIEW_SIZE_MIN, next));
}

function mediaErrorMessage(err) {
    if (!navigator.mediaDevices?.getUserMedia) {
        return 'Video calls need a modern browser with camera and microphone support.';
    }
    if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        return 'Camera or microphone access was blocked by the browser.';
    }
    if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        return 'No camera or microphone was found on this device.';
    }
    return 'Could not start the video call: ' + (err?.message || 'unknown error');
}

function VideoCall({ consultationId, currentUserId, peerLabel }) {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [status, setStatus] = useState('Video call ready.');
    const [callActive, setCallActive] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [peerMedia, setPeerMedia] = useState(null);
    const [previewSize, setPreviewSize] = useState(() => {
        try {
            return clampPreviewSize(localStorage.getItem(PREVIEW_SIZE_KEY));
        } catch {
            return 144;
        }
    });

    const socketRef = useRef(null);
    const pcRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const peerReadyRef = useRef(null);
    const pendingOfferRef = useRef(null);
    const candidateQueueRef = useRef([]);
    const callActiveRef = useRef(false);

    useEffect(() => {
        const token = localStorage.getItem('telemed_token') || '';
        const sock = io(CHAT_SERVER_URL, {
            auth: { token },
            withCredentials: true,
            // Begin with HTTP polling. Render reliably accepts this transport
            // and Socket.IO upgrades to WebSocket when the proxy permits it.
            // Starting WebSocket-first leaves video signaling disconnected when
            // a transient proxy upgrade fails.
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 5,
        });
        socketRef.current = sock;

        sock.on('connect', () => {
            setStatus('Video signaling connected.');
            sock.emit('join', { consultationId, purpose: 'video' });
        });
        sock.on('joined', () => setStatus('Video call ready.'));
        sock.on('video-peer-joined', ({ from }) => {
            if (!callActiveRef.current) {
                setStatus(`${from?.role || peerLabel} joined the video room. Start video when you are ready.`);
                return;
            }

            const stream = localStreamRef.current;
            sock.emit('video-ready', {
                audioEnabled: stream?.getAudioTracks().some(track => track.enabled) ?? audioEnabled,
                videoEnabled: stream?.getVideoTracks().some(track => track.enabled) ?? videoEnabled,
            });
        });
        sock.on('video-ready', handlePeerReady);
        sock.on('video-offer', handleOffer);
        sock.on('video-answer', handleAnswer);
        sock.on('video-ice-candidate', handleIceCandidate);
        sock.on('video-state', ({ audioEnabled: peerAudio, videoEnabled: peerVideo }) => {
            setPeerMedia({ audioEnabled: !!peerAudio, videoEnabled: !!peerVideo });
        });
        sock.on('video-end', ({ from }) => {
            resetCall(false);
            setStatus(`${from?.role || 'The other participant'} ended the video call.`);
        });
        sock.on('video-error', e => setStatus('Video error: ' + (e?.error || 'unknown')));
        sock.on('connect_error', err => setStatus('Video signaling error: ' + err.message));

        return () => {
            sock.disconnect();
            if (pcRef.current) pcRef.current.close();
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [consultationId]);

    useEffect(() => {
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    }, [remoteStream]);

    useEffect(() => {
        try {
            localStorage.setItem(PREVIEW_SIZE_KEY, String(previewSize));
        } catch {
            // Ignore storage restrictions; the slider still works for this call.
        }
    }, [previewSize]);

    function ensurePeerConnection() {
        if (pcRef.current) return pcRef.current;

        const pc = new RTCPeerConnection(RTC_CONFIG);
        pc.onicecandidate = ({ candidate }) => {
            if (candidate) socketRef.current?.emit('video-ice-candidate', { candidate });
        };
        pc.ontrack = event => {
            let stream = remoteStreamRef.current;
            if (!stream) {
                stream = new MediaStream();
                remoteStreamRef.current = stream;
                setRemoteStream(stream);
            }
            const incoming = event.streams[0]?.getTracks() || [event.track];
            incoming.forEach(track => {
                if (!stream.getTracks().some(existing => existing.id === track.id)) {
                    stream.addTrack(track);
                }
            });
            setStatus('Video call connected.');
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') setStatus('Video call connected.');
            if (pc.connectionState === 'connecting') setStatus('Connecting video...');
            if (pc.connectionState === 'disconnected') setStatus('Video connection interrupted. Reconnecting...');
            if (pc.connectionState === 'failed') {
                setStatus('Video connection failed. Check both connections, then end and start the call again.');
            }
        };
        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'checking') setStatus('Finding a video connection...');
            if (pc.iceConnectionState === 'failed') {
                setStatus('Could not find a video route. A TURN server may be needed on this network.');
            }
        };
        pcRef.current = pc;
        return pc;
    }

    function attachLocalTracks(pc, stream) {
        const existing = pc.getSenders().map(sender => sender.track?.id).filter(Boolean);
        stream.getTracks().forEach(track => {
            if (!existing.includes(track.id)) pc.addTrack(track, stream);
        });
    }

    async function getLocalMedia() {
        if (localStreamRef.current) return localStreamRef.current;
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Media devices are not available.');

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (err) {
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
                .catch(() => { throw err; });
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setAudioEnabled(stream.getAudioTracks().some(track => track.enabled));
        setVideoEnabled(stream.getVideoTracks().some(track => track.enabled));
        return stream;
    }

    async function startCall() {
        const sock = socketRef.current;
        if (!sock?.connected) {
            setStatus('Video signaling is still connecting.');
            return;
        }

        setConnecting(true);
        try {
            const stream = await getLocalMedia();
            const pc = ensurePeerConnection();
            attachLocalTracks(pc, stream);
            const nextAudioEnabled = stream.getAudioTracks().some(track => track.enabled);
            const nextVideoEnabled = stream.getVideoTracks().some(track => track.enabled);
            callActiveRef.current = true;
            setCallActive(true);
            setStatus('Waiting for the other participant...');
            sock.emit('video-ready', { audioEnabled: nextAudioEnabled, videoEnabled: nextVideoEnabled });
            sock.emit('video-state', { audioEnabled: nextAudioEnabled, videoEnabled: nextVideoEnabled });

            if (pendingOfferRef.current) {
                await answerOffer(pendingOfferRef.current);
                pendingOfferRef.current = null;
            } else if (shouldCreateOffer(peerReadyRef.current)) {
                await createOffer();
            }
        } catch (err) {
            setStatus(mediaErrorMessage(err));
        } finally {
            setConnecting(false);
        }
    }

    function shouldCreateOffer(peer) {
        return peer?.uid && Number(currentUserId) < Number(peer.uid);
    }

    async function createOffer() {
        const pc = ensurePeerConnection();
        if (pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit('video-offer', { description: pc.localDescription });
        setStatus('Calling...');
    }

    async function answerOffer(payload) {
        const pc = ensurePeerConnection();
        const stream = await getLocalMedia();
        attachLocalTracks(pc, stream);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.description));
        await flushQueuedCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit('video-answer', { description: pc.localDescription });
        setStatus('Connecting video...');
    }

    async function handlePeerReady(payload) {
        peerReadyRef.current = payload.from;
        setPeerMedia({
            audioEnabled: !!payload.audioEnabled,
            videoEnabled: !!payload.videoEnabled,
        });

        if (!callActiveRef.current) {
            setStatus(`${payload.from?.role || peerLabel} is ready for a video call.`);
            return;
        }

        setStatus('Both participants are ready. Starting video...');
        if (shouldCreateOffer(payload.from)) await createOffer();
    }

    async function handleOffer(payload) {
        if (!callActiveRef.current) {
            pendingOfferRef.current = payload;
            setStatus('Incoming video call. Start video to join.');
            return;
        }
        try {
            await answerOffer(payload);
        } catch (err) {
            setStatus('Could not answer video call: ' + err.message);
        }
    }

    async function handleAnswer(payload) {
        const pc = pcRef.current;
        if (!pc || !payload.description) return;
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.description));
            await flushQueuedCandidates();
            setStatus('Connecting video...');
        } catch (err) {
            setStatus('Could not connect video answer: ' + err.message);
        }
    }

    async function handleIceCandidate({ candidate }) {
        if (!candidate) return;
        const pc = ensurePeerConnection();
        if (!pc.remoteDescription) {
            candidateQueueRef.current.push(candidate);
            return;
        }
        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (_) {}
    }

    async function flushQueuedCandidates() {
        const pc = pcRef.current;
        if (!pc?.remoteDescription) return;
        const queued = candidateQueueRef.current.splice(0);
        for (const candidate of queued) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (_) {}
        }
    }

    function toggleAudio() {
        const next = !audioEnabled;
        localStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = next; });
        setAudioEnabled(next);
        socketRef.current?.emit('video-state', { audioEnabled: next, videoEnabled });
    }

    function toggleVideo() {
        const next = !videoEnabled;
        localStreamRef.current?.getVideoTracks().forEach(track => { track.enabled = next; });
        setVideoEnabled(next);
        socketRef.current?.emit('video-state', { audioEnabled, videoEnabled: next });
    }

    function resetCall(notify = true) {
        if (notify) socketRef.current?.emit('video-end', {});
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        remoteStreamRef.current = null;
        peerReadyRef.current = null;
        pendingOfferRef.current = null;
        candidateQueueRef.current = [];
        callActiveRef.current = false;
        setLocalStream(null);
        setRemoteStream(null);
        setPeerMedia(null);
        setCallActive(false);
        setAudioEnabled(true);
        setVideoEnabled(true);
        if (notify) setStatus('Video call ended.');
    }

    const peerMuted = peerMedia && (!peerMedia.audioEnabled || !peerMedia.videoEnabled);

    return (
        <Card>
            <div className="video-header">
                <h3><VideoIcon size={18} /> Video consultation</h3>
                <span className={`video-status ${callActive ? 'live' : ''}`}>{callActive ? 'Live' : 'Ready'}</span>
            </div>

            <div className="video-stage">
                <div className="video-tile remote">
                    {remoteStream ? (
                        <video ref={remoteVideoRef} autoPlay playsInline />
                    ) : (
                        <div className="video-placeholder">
                            <VideoIcon size={28} />
                            <span>Waiting for {peerLabel}</span>
                        </div>
                    )}
                    {peerMuted && (
                        <div className="video-peer-state">
                            {!peerMedia.audioEnabled ? 'Muted' : ''}
                            {!peerMedia.audioEnabled && !peerMedia.videoEnabled ? ' / ' : ''}
                            {!peerMedia.videoEnabled ? 'Camera off' : ''}
                        </div>
                    )}
                </div>

                <div className="video-tile local" style={{ '--preview-size': `${previewSize}px` }}>
                    {localStream ? (
                        <video ref={localVideoRef} autoPlay playsInline muted />
                    ) : (
                        <div className="video-placeholder compact">
                            <VideoOffIcon size={20} />
                            <span>Your camera</span>
                        </div>
                    )}
                    <div className="video-label">You</div>
                </div>
            </div>

            <div className="video-controls">
                {!callActive ? (
                    <motion.button onClick={startCall} whileTap={{ scale: 0.97 }} disabled={connecting}>
                        <VideoIcon size={16} /> {connecting ? 'Starting...' : 'Start video call'}
                    </motion.button>
                ) : (
                    <>
                        <motion.button className="btn-secondary" onClick={toggleAudio} whileTap={{ scale: 0.97 }}>
                            {audioEnabled ? <MicIcon size={16} /> : <MicOffIcon size={16} />}
                            {audioEnabled ? 'Mute' : 'Unmute'}
                        </motion.button>
                        <motion.button className="btn-secondary" onClick={toggleVideo} whileTap={{ scale: 0.97 }}>
                            {videoEnabled ? <VideoIcon size={16} /> : <VideoOffIcon size={16} />}
                            {videoEnabled ? 'Camera off' : 'Camera on'}
                        </motion.button>
                        <motion.button className="btn-danger" onClick={() => resetCall(true)} whileTap={{ scale: 0.97 }}>
                            <VideoOffIcon size={16} /> End call
                        </motion.button>
                    </>
                )}
                <label className="video-preview-size">
                    <span>Preview size</span>
                    <input
                        type="range"
                        min={PREVIEW_SIZE_MIN}
                        max={PREVIEW_SIZE_MAX}
                        step="4"
                        value={previewSize}
                        onChange={e => setPreviewSize(clampPreviewSize(e.target.value))}
                    />
                </label>
            </div>
            <div className="chat-system">{status}</div>
        </Card>
    );
}

function ChatBox({ consultationId, currentUserId, currentUserRole }) {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [system, setSystem] = useState('');
    const socketRef = useRef(null);
    const boxRef = useRef(null);
    const roomJoinedRef = useRef(false);

    function mergeMessages(incoming) {
        setMessages(current => {
            const seen = new Set(current.map(message => String(message.message_id)));
            const additions = incoming.filter(message => !seen.has(String(message.message_id)));
            return additions.length ? [...current, ...additions] : current;
        });
    }

    function syncMessages() {
        return API.get(`/consultations/${consultationId}/messages`)
            .then(r => mergeMessages(r.messages || []))
            .catch(() => {});
    }

    useEffect(() => {
        let mounted = true;
        // Load history first
        API.get(`/consultations/${consultationId}/messages`)
            .then(r => mounted && setMessages(r.messages || []))
            .catch(e => mounted && setSystem('Could not load chat history.'));

        // Connect socket
        const token = localStorage.getItem('telemed_token') || '';
        const sock = io(CHAT_SERVER_URL, {
            auth: { token },
            withCredentials: true,
            // Keep chat and video signalling reachable even if the Render
            // WebSocket upgrade is temporarily unavailable.
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 5,
        });
        socketRef.current = sock;

        sock.on('connect', () => {
            roomJoinedRef.current = false;
            setSystem('Connecting to consultation chat...');
            sock.emit('join', { consultationId });
        });
        sock.on('joined', () => {
            roomJoinedRef.current = true;
            setSystem('Connected to chat server.');
            syncMessages();
        });
        sock.on('peer-joined', ({ role }) => setSystem(`A ${role} has joined the conversation.`));
        sock.on('message', msg => {
            if (mounted) mergeMessages([msg]);
        });
        sock.on('typing', ({ role, isTyping }) => {
            if (isTyping) setSystem(`${role} is typing...`);
        });
        sock.on('disconnect', () => {
            roomJoinedRef.current = false;
        });
        sock.on('connect_error', err => {
            roomJoinedRef.current = false;
            setSystem('Chat connection error: ' + err.message);
        });
        sock.on('error', e => {
            const message = e?.error || 'unknown';
            if (message === 'not in a room' && sock.connected) {
                roomJoinedRef.current = false;
                sock.emit('join', { consultationId });
                setSystem('Rejoining consultation chat...');
                return;
            }
            setSystem('Chat error: ' + message);
        });

        // Socket.IO is the immediate delivery channel. This small sync loop also
        // picks up messages sent through the REST fallback without a page refresh.
        const syncInterval = window.setInterval(() => {
            if (mounted) syncMessages();
        }, 1000);
        const syncOnFocus = () => { if (mounted) syncMessages(); };
        window.addEventListener('focus', syncOnFocus);

        return () => {
            mounted = false;
            roomJoinedRef.current = false;
            window.clearInterval(syncInterval);
            window.removeEventListener('focus', syncOnFocus);
            sock.disconnect();
        };
    }, [consultationId]);

    useEffect(() => {
        if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }, [messages]);

    function send() {
        const t = text.trim();
        if (!t) return;
        const sock = socketRef.current;
        if (sock?.connected && roomJoinedRef.current) {
            sock.emit('message', { message: t });
        } else {
            // REST fallback keeps the current screen in place while reconnection occurs.
            API.post(`/consultations/${consultationId}/messages`, { message: t })
                .then(r => mergeMessages([{
                    message_id: r.id,
                    sender_user_id: currentUserId,
                    sender_role: currentUserRole,
                    message_text: t,
                    sent_at: new Date().toISOString(),
                }]))
                .catch(e => setSystem('Send failed: ' + e.message));
        }
        setText('');
    }

    return (
        <Card>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MessageIcon size={18} /> Real-time chat</h3>
            <div className="chat-wrap">
                <div className="chat-messages" ref={boxRef}>
                    <AnimatePresence>
                        {messages.map(msg => {
                            const senderId = msg.sender_user_id ?? msg.senderUserId ?? msg.sender_id;
                            const hasParticipantRole = ['patient', 'doctor'].includes(msg.sender_role);
                            // Each consultation has one patient and one doctor. Prefer the
                            // role recorded with the message, then fall back to the user ID
                            // for older messages that do not include a role.
                            const isMe = hasParticipantRole
                                ? msg.sender_role === currentUserRole
                                : senderId != null && currentUserId != null && String(senderId) === String(currentUserId);
                            const senderLabel = isMe
                                ? 'You'
                                : (msg.sender_role ? `${msg.sender_role.charAt(0).toUpperCase()}${msg.sender_role.slice(1)}` : 'Participant');
                            return (
                                <motion.div
                                    key={msg.message_id || `${msg.sent_at}-${msg.sender_user_id}`}
                                    className={`chat-message-row ${isMe ? 'me' : 'them'}`}
                                    variants={chatMessageVariants(isMe)}
                                    initial="initial"
                                    animate="animate"
                                >
                                    <div className={`chat-msg ${isMe ? 'me' : 'them'}`}>
                                        {msg.message_text}
                                        <span className="meta">{senderLabel} · {fmtDateTime(msg.sent_at)}</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
                <div className="chat-input-row">
                    <input
                        type="text"
                        value={text}
                        placeholder="Type your message..."
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') send(); }}
                    />
                    <motion.button onClick={send} whileTap={{ scale: 0.97 }}>Send</motion.button>
                </div>
            </div>
            <div className="chat-system">{system}</div>
        </Card>
    );
}

function CommunicationPanel({ consultation, currentUserId, userRole }) {
    const mode = consultation.communication_mode === 'video' ? 'video' : 'chat';
    const approved = ['assigned', 'in_progress'].includes(consultation.status) && consultation.doctor_id;
    const closed = ['prescribed', 'referred', 'completed', 'cancelled'].includes(consultation.status);

    if (!approved) {
        return (
            <Card className="communication-request-card" id="consultation-communication">
                <div className="video-header">
                    <h3>{mode === 'video' ? <VideoIcon size={18} /> : <MessageIcon size={18} />} Communication request</h3>
                    <span className="tag primary">{mode} requested</span>
                </div>
                <p className="muted">
                    {closed
                        ? `This consultation is ${consultation.status}; active ${mode} communication is closed.`
                        : userRole === 'doctor'
                            ? `The patient requested a ${mode} consultation. Accept the request to approve and open the ${mode} module.`
                            : `Your ${mode} consultation request is waiting for a doctor to approve it.`}
                </p>
            </Card>
        );
    }

    return (
        <div className="communication-grid communication-single" id="consultation-communication">
            {mode === 'video' ? (
                <VideoCall
                    consultationId={consultation.consultation_id}
                    currentUserId={currentUserId}
                    peerLabel={userRole === 'doctor' ? 'patient' : 'doctor'}
                />
            ) : (
                <ChatBox
                    consultationId={consultation.consultation_id}
                    currentUserId={currentUserId}
                    currentUserRole={userRole}
                />
            )}
        </div>
    );
}

function DoctorActionPanel({ consultation, onDone }) {
    const toast = useToast();
    const [tab, setTab] = useState('prescribe');
    const [pharmacists, setPharmacists] = useState([]);
    const [drugs, setDrugs] = useState([]);
    const [allergies, setAllergies] = useState([]);
    const [conditions, setConditions] = useState([]);
    const [selectedDrugId, setSelectedDrugId] = useState('');
    const [manualMedicine, setManualMedicine] = useState(false);
    const medicineInputRef = useRef(null);

    // Prescription form
    const [rx, setRx] = useState({
        pharmacist_id: '',
        medication_name: '',
        medicine_form: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        diagnosis: '',
    });

    // Referral form
    const [ref, setRef] = useState({
        clinic_name: '',
        clinic_address: '',
        clinic_contact: '',
        appointment_date: '',
        appointment_time: '',
        referral_reason: '',
    });

    // Note form
    const [note, setNote] = useState({ title: '', content: '' });

    useEffect(() => {
        API.get('/pharmacists').then(r => setPharmacists(r.pharmacists || []));
        API.get('/drugs').then(r => setDrugs(r.drugs || []));
        API.get('/allergies', { patient_id: consultation.patient_id }).then(r => setAllergies(r.allergies || []));
        API.get('/conditions', { patient_id: consultation.patient_id }).then(r => setConditions(r.conditions || []));
    }, [consultation.patient_id]);

    useEffect(() => {
        if (manualMedicine) medicineInputRef.current?.focus();
    }, [manualMedicine]);

    function formatMedicationName(name, form) {
        const trimmedName = name.trim();
        const trimmedForm = (form || '').trim();
        if (!trimmedForm || trimmedName.toLowerCase().includes(trimmedForm.toLowerCase())) return trimmedName;
        return `${trimmedName} (${trimmedForm})`;
    }

    function handleDrugSelection(value) {
        setSelectedDrugId(value);
        if (value === MANUAL_DRUG_VALUE) {
            setManualMedicine(true);
            setRx(r => ({
                ...r,
                medication_name: '',
                medicine_form: '',
                dosage: '',
                frequency: '',
            }));
            return;
        }

        setManualMedicine(false);
        if (value) pickDrug(value);
    }

    function pickDrug(id) {
        const d = drugs.find(x => String(x.drug_id) === String(id));
        if (!d) return;
        setRx(r => ({
            ...r,
            medication_name: `${d.name} ${d.strength || ''}`.trim(),
            medicine_form: d.form || '',
            dosage: d.common_dosage || '',
            frequency: d.common_frequency || '',
        }));
    }

    async function submitRx() {
        const body = {
            consultation_id: consultation.consultation_id,
            pharmacist_id: parseInt(rx.pharmacist_id || 0, 10),
            medication_name: formatMedicationName(rx.medication_name, rx.medicine_form),
            dosage: rx.dosage.trim(),
            frequency: rx.frequency.trim(),
            duration: rx.duration.trim(),
            instructions: rx.instructions.trim() || null,
        };
        if (!body.pharmacist_id || !body.medication_name || !body.dosage || !body.frequency || !body.duration) {
            toast('All required fields plus a pharmacy must be filled', 'error');
            return;
        }
        try {
            const res = await API.post('/prescriptions', body);
            toast(`Prescription ${res.prescription_uid} issued`, 'success');
            if (rx.diagnosis.trim()) {
                await API.post('/records', {
                    patient_id: consultation.patient_id,
                    consultation_id: consultation.consultation_id,
                    title: 'Consultation diagnosis',
                    content: rx.diagnosis.trim(),
                });
            }
            setTimeout(() => onDone('prescriptions'), 600);
        } catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    async function submitRef() {
        if (!ref.clinic_name || !ref.clinic_address || !ref.appointment_date || !ref.appointment_time || !ref.referral_reason) {
            toast('All required fields must be filled', 'error');
            return;
        }
        try {
            await API.post('/referrals', { consultation_id: consultation.consultation_id, ...ref, clinic_contact: ref.clinic_contact || null });
            toast('Referral created', 'success');
            setTimeout(() => onDone('referrals'), 600);
        } catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    async function submitNote() {
        if (!note.title || !note.content) { toast('Title and content required', 'error'); return; }
        try {
            await API.post('/records', {
                patient_id: consultation.patient_id,
                consultation_id: consultation.consultation_id,
                title: note.title, content: note.content,
            });
            toast('Note added to patient record', 'success');
            setNote({ title: '', content: '' });
        } catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    async function closeConsultation() {
        if (!confirm('Close this consultation as completed?')) return;
        try {
            await API.post(`/consultations/${consultation.consultation_id}/close`, {
                diagnosis_notes: rx.diagnosis || '',
                final_status: 'completed',
            });
            toast('Consultation closed', 'success');
            setTimeout(() => onDone('consultations'), 600);
        } catch (e) { toast('Failed: ' + e.message, 'error'); }
    }

    return (
        <>
            <Card>
                <h3>Patient context</h3>
                <div className="muted small">
                    DOB: {consultation.date_of_birth || '—'} · Gender: {consultation.gender || '—'}
                </div>
                {consultation.medical_history_summary && (
                    <p className="muted small">{consultation.medical_history_summary}</p>
                )}
                {allergies.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                        <strong style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><AlertIcon size={14} /> Allergies:</strong>{' '}
                        {allergies.map(a => (
                            <span key={a.allergy_id} className="tag danger">{a.allergen} ({a.severity})</span>
                        ))}
                    </div>
                )}
                {conditions.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><StethoscopeIcon size={14} /> Conditions:</strong>{' '}
                        {conditions.map(c => (
                            <span key={c.condition_id} className="tag">{c.condition_name}</span>
                        ))}
                    </div>
                )}
            </Card>

            <Card hover={false} className="doctor-action-card">
                <div className="tabs">
                    <div className={`tab ${tab === 'prescribe' ? 'active' : ''}`} onClick={() => setTab('prescribe')}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><PillIcon size={16} /> Prescribe</span>
                    </div>
                    <div className={`tab ${tab === 'refer' ? 'active' : ''}`} onClick={() => setTab('refer')}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><HospitalIcon size={16} /> Refer</span>
                    </div>
                    <div className={`tab ${tab === 'note' ? 'active' : ''}`} onClick={() => setTab('note')}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><NoteIcon size={16} /> Note</span>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {tab === 'prescribe' && (
                        <motion.div
                            key="prescribe"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                        >
                            <div className="field drug-catalog-field">
                                <label>Pick from drug catalog</label>
                                <select
                                    className="drug-catalog-select"
                                    value={selectedDrugId}
                                    onChange={e => handleDrugSelection(e.target.value)}
                                >
                                    <option value="">-- pick a medication --</option>
                                    <option value={MANUAL_DRUG_VALUE}>Medicine not listed - enter manually</option>
                                    {drugs.map(d => (
                                        <option key={d.drug_id} value={d.drug_id}>
                                            {d.name} {d.strength || ''} ({d.form})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {manualMedicine && (
                                <div className="manual-prescription-panel">
                                    <div className="manual-prescription-heading">
                                        <PillIcon size={16} />
                                        Manual medicine entry
                                    </div>
                                    <div className="grid grid-2">
                                        <div className="field">
                                            <label className="required">Medicine name / type</label>
                                            <input
                                                ref={medicineInputRef}
                                                type="text"
                                                value={rx.medication_name}
                                                onChange={e => setRx(r => ({ ...r, medication_name: e.target.value }))}
                                                placeholder="e.g. Cefixime 200mg"
                                            />
                                        </div>
                                        <div className="field">
                                            <label>Medicine form</label>
                                            <select value={rx.medicine_form} onChange={e => setRx(r => ({ ...r, medicine_form: e.target.value }))}>
                                                <option value="">-- choose form --</option>
                                                {MEDICINE_FORMS.map(form => (
                                                    <option key={form} value={form}>{form}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="field">
                                <label className="required">Pharmacy</label>
                                <select value={rx.pharmacist_id} onChange={e => setRx(r => ({ ...r, pharmacist_id: e.target.value }))}>
                                    <option value="">-- choose pharmacy --</option>
                                    {pharmacists.map(p => (
                                        <option key={p.pharmacist_id} value={p.pharmacist_id}>
                                            {p.pharmacy_name} — {p.pharmacy_address}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {!manualMedicine && (
                                <div className="field">
                                    <label className="required">Medication name</label>
                                    <input
                                        type="text"
                                        value={rx.medication_name}
                                        onChange={e => setRx(r => ({ ...r, medication_name: e.target.value }))}
                                        placeholder="e.g. Amoxicillin 500mg"
                                    />
                                </div>
                            )}
                            <div className="grid grid-2">
                                <div className="field"><label className="required">Dosage</label><input type="text" value={rx.dosage} onChange={e => setRx(r => ({ ...r, dosage: e.target.value }))} placeholder="e.g. 1 capsule" /></div>
                                <div className="field"><label className="required">Frequency</label><input type="text" value={rx.frequency} onChange={e => setRx(r => ({ ...r, frequency: e.target.value }))} placeholder="e.g. 3 times daily" /></div>
                            </div>
                            <div className="field"><label className="required">Duration</label><input type="text" value={rx.duration} onChange={e => setRx(r => ({ ...r, duration: e.target.value }))} placeholder="e.g. 7 days" /></div>
                            <div className="field"><label>Instructions</label><textarea value={rx.instructions} onChange={e => setRx(r => ({ ...r, instructions: e.target.value }))} placeholder="Take after meals..." /></div>
                            <div className="field"><label>Diagnosis note</label><textarea value={rx.diagnosis} onChange={e => setRx(r => ({ ...r, diagnosis: e.target.value }))} placeholder="Brief diagnosis - saved to patient record" /></div>
                            <motion.button onClick={submitRx} whileTap={{ scale: 0.97 }}>Issue prescription →</motion.button>
                        </motion.div>
                    )}

                    {tab === 'refer' && (
                        <motion.div
                            key="refer"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                        >
                            <Alert kind="warn">Use this when symptoms are ambiguous and require physical examination.</Alert>
                            <div className="field"><label className="required">Clinic name</label><input type="text" value={ref.clinic_name} onChange={e => setRef(r => ({ ...r, clinic_name: e.target.value }))} placeholder="Levy Mwanawasa MUTH" /></div>
                            <div className="field"><label className="required">Clinic address</label><input type="text" value={ref.clinic_address} onChange={e => setRef(r => ({ ...r, clinic_address: e.target.value }))} /></div>
                            <div className="field"><label>Clinic phone</label><input type="text" value={ref.clinic_contact} onChange={e => setRef(r => ({ ...r, clinic_contact: e.target.value }))} placeholder="+260..." /></div>
                            <div className="grid grid-2">
                                <div className="field"><label className="required">Date</label><input type="date" value={ref.appointment_date} onChange={e => setRef(r => ({ ...r, appointment_date: e.target.value }))} /></div>
                                <div className="field"><label className="required">Time</label><input type="time" value={ref.appointment_time} onChange={e => setRef(r => ({ ...r, appointment_time: e.target.value }))} /></div>
                            </div>
                            <div className="field"><label className="required">Reason for referral</label><textarea value={ref.referral_reason} onChange={e => setRef(r => ({ ...r, referral_reason: e.target.value }))} placeholder="e.g. Possible hepatobiliary issue. Requires LFTs and abdominal ultrasound." /></div>
                            <motion.button className="btn-warn" onClick={submitRef} whileTap={{ scale: 0.97 }}>Create referral →</motion.button>
                        </motion.div>
                    )}

                    {tab === 'note' && (
                        <motion.div
                            key="note"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                        >
                            <div className="field"><label className="required">Note title</label><input type="text" value={note.title} onChange={e => setNote(n => ({ ...n, title: e.target.value }))} placeholder="Follow-up plan" /></div>
                            <div className="field"><label className="required">Note content</label><textarea value={note.content} onChange={e => setNote(n => ({ ...n, content: e.target.value }))} /></div>
                            <motion.button onClick={submitNote} whileTap={{ scale: 0.97 }}>Add to patient record</motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            <Card>
                <h3>Close consultation</h3>
                <p className="muted small">If no prescription or referral is needed, close the consultation with a brief diagnosis note.</p>
                <div style={{ marginTop: 12 }}>
                    <motion.button className="btn-secondary" onClick={closeConsultation} whileTap={{ scale: 0.97 }}>Close as completed</motion.button>
                </div>
            </Card>
        </>
    );
}

export default function Consultation() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const location = useLocation();
    const viewOnly = !!params.get('view');
    const { user } = useAuth();
    const toast = useToast();
    const [consultation, setConsultation] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        API.get(`/consultations/${id}`)
            .then(r => setConsultation(r.consultation))
            .catch(e => setError(e.message));
    }, [id]);

    useEffect(() => {
        if (!consultation || !location.hash) return;
        const target = document.getElementById(location.hash.slice(1));
        if (!target) return;

        const timer = window.setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);

        return () => window.clearTimeout(timer);
    }, [consultation, location.hash]);

    if (error) return <Alert kind="error">Could not load consultation: {error}</Alert>;
    if (!consultation || !user) return null;

    const c = consultation;
    const triageCls = c.triage_recommendation || 'routine';
    const communicationMode = c.communication_mode === 'video' ? 'video' : 'chat';
    const isDoctorActive = user.role === 'doctor' && !viewOnly &&
        ['assigned', 'in_progress'].includes(c.status);

    async function approveConsultation() {
        try {
            await API.post(`/consultations/${c.consultation_id}/accept`);
            const r = await API.get(`/consultations/${c.consultation_id}`);
            setConsultation(r.consultation);
            toast(`${communicationMode} consultation approved`, 'success');
        } catch (e) {
            toast('Could not approve consultation: ' + e.message, 'error');
        }
    }

    let rightPanel;
    if (user.role === 'patient') {
        rightPanel = (
            <>
                <Card>

                    <p className="muted">You requested a {communicationMode} consultation. Once a doctor accepts it, the {communicationMode} module opens on this page.</p>
                    <div className="gap-sm"><Pill status={c.status} /></div>
                </Card>
                <Card style={{ borderLeft: '4px solid var(--warn)' }}>
                    <h3>Need urgent help?</h3>
                    <p className="small muted">If your symptoms worsen before the doctor responds, please go to the nearest clinic immediately or call emergency services.</p>
                </Card>
            </>
        );
    } else if (user.role === 'doctor' && c.status === 'queued') {
        rightPanel = (
            <Card style={{ borderLeft: '4px solid var(--primary)' }}>
                <h3>Approve request</h3>
                <p className="muted small">The patient requested a {communicationMode} consultation. Approval assigns this consultation to you and opens the requested communication module.</p>
                <motion.button onClick={approveConsultation} whileTap={{ scale: 0.97 }}>
                    Approve &amp; start {communicationMode}
                </motion.button>
            </Card>
        );
    } else if (!isDoctorActive) {
        rightPanel = (
            <>
                <Card>
                    <h3>Diagnosis notes</h3>
                    <p>{c.diagnosis_notes || '— no notes recorded —'}</p>
                </Card>
                <Card>
                    <h3>Outcome</h3>
                    <p>This consultation is closed. Status: <Pill status={c.status} /></p>
                </Card>
            </>
        );
    } else {
        rightPanel = <DoctorActionPanel consultation={c} onDone={(dest) => navigate('/' + dest)} />;
    }

    return (
        <>
            <PageHeader
                title={c.patient_name}
                lead={`Consultation #${c.consultation_id} · requested ${fmtDateTime(c.requested_at)}${c.doctor_name ? ' · with ' + c.doctor_name : ''}`}
                
            />

            <CommunicationPanel
                consultation={c}
                currentUserId={user.id ?? user.user_id}
                userRole={user.role}
            />

            <div className="consultation-detail-stack">
                <motion.div variants={staggerContainer} initial="initial" animate="animate">
                    <Card id="submitted-symptoms" className="submitted-symptoms-card">
                        <motion.div variants={staggerItem}>
                            <h3>Submitted symptoms</h3>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{c.submitted_symptoms}</p>
                        </motion.div>
                        {c.triage_recommendation && (
                            <motion.div className={`triage-result ${triageCls}`} variants={staggerItem}>
                                <strong>Triage: {triageCls.toUpperCase()}</strong> (score {c.triage_score || 0})<br />
                                {TRIAGE_MSG[triageCls]}
                            </motion.div>
                        )}
                    </Card>
                </motion.div>

                <motion.div variants={staggerContainer} initial="initial" animate="animate">
                    {rightPanel}
                </motion.div>
            </div>
        </>
    );
}
