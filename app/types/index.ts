export interface Doctor {
    id: number;
    name: string;
    specialty: string;
    experience: string;
    rating: number;
    image: string;
}


export interface Appointment {
    id: number;
    date: string;
    time: string;
    doctor: string;
    type: string;
}


export interface VitalSigns {
    id: number;
    vital: string;
    value: string;
    trend: string;
}


// More files will follow next.