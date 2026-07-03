import React, { useCallback } from 'react';
import WhiteboardDrawSurface from '../../components/Whiteboard/WhiteboardDrawSurface';

const WhiteboardStudent = ({ lessonProblemData, lessonRoomId, lessonNickname, lessonSocket }) => {
    const { backgroundUrl, backgroundType = 'blank', question } = lessonProblemData;

    const handleSnapshot = useCallback((dataUrl) => {
        if (lessonSocket && lessonRoomId) {
            lessonSocket.emit('submitLessonAnswer', {
                lessonId: lessonRoomId,
                studentName: lessonNickname,
                answer: { type: 'image', data: dataUrl },
            });
        }
    }, [lessonSocket, lessonRoomId, lessonNickname]);

    return (
        <WhiteboardDrawSurface
            backgroundType={backgroundType}
            backgroundUrl={backgroundUrl}
            question={question}
            onSnapshot={handleSnapshot}
            fullScreen
        />
    );
};

export default WhiteboardStudent;
