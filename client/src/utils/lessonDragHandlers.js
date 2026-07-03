import { problemToSlide } from './problemToSlide';

export function handleLessonDragEnd(result, archiveProblems, setSlides, setActiveSlideId) {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === 'archive-pool') {
        if (destination.droppableId !== 'slides-list') return;

        const problemId = draggableId.replace(/^archive_/, '');
        const problem = archiveProblems.find((p) => p.id === problemId);
        if (!problem) return;

        const newSlide = problemToSlide(problem);
        setSlides((prev) => {
            const next = Array.from(prev);
            next.splice(destination.index, 0, newSlide);
            return next;
        });
        setActiveSlideId(newSlide.id);
        return;
    }

    if (source.droppableId === 'slides-list' && destination.droppableId === 'slides-list') {
        setSlides((prev) => {
            const next = Array.from(prev);
            const [moved] = next.splice(source.index, 1);
            next.splice(destination.index, 0, moved);
            return next;
        });
    }
}

export function addArchiveProblemAsSlide(problem, setSlides, setActiveSlideId) {
    const newSlide = problemToSlide(problem);
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideId(newSlide.id);
}
