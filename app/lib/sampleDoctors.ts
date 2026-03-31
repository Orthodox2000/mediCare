export type SampleDoctor = {
  name: string;
  fields: string[];
  hospitals: string[];
  experience: string;
  rating: number;
  patients: number;
  imageUrl?: string;
};

export const SAMPLE_DOCTORS: SampleDoctor[] = [
  {
    name: "Dr. Supriya Khandekar",
    fields: [
      "Cardiology",
      "Interventional Cardiology",
      "Preventive Cardiology",
      "General Medicine",
    ],
    hospitals: ["SWACS Hospital", "MetroCare Hospital"],
    experience: "24 years",
    rating: 5,
    patients: 6400,
    imageUrl: "/spk.png",
  },
  {
    name: "Dr. Piyush Raut",
    fields: ["Neurology", "Neurophysiology"],
    hospitals: ["SWACS Hospital", "City General Hospital"],
    experience: "12 years",
    rating: 4.8,
    patients: 2100,
  },
  {
    name: "Dr. Poonam Shinde",
    fields: ["Pediatrics", "Neonatology"],
    hospitals: ["Sunrise Medical Center", "SWACS Hospital"],
    experience: "10 years",
    rating: 4.8,
    patients: 3200,
  },
  {
    name: "Dr. Prashant Shinde",
    fields: ["Orthopedics", "Sports Injury"],
    hospitals: ["Lifeline Multispecialty Hospital", "City General Hospital"],
    experience: "18 years",
    rating: 4.7,
    patients: 1800,
  },
  {
    name: "Dr. Diksha Patil",
    fields: ["Dermatology", "Cosmetology"],
    hospitals: ["MetroCare Hospital", "Sunrise Medical Center"],
    experience: "14 years",
    rating: 4.8,
    patients: 2400,
  },
  {
    name: "Dr. Atharva More",
    fields: ["General Medicine", "Diabetology"],
    hospitals: ["SWACS Hospital", "MetroCare Hospital"],
    experience: "5 years",
    rating: 4.6,
    patients: 980,
  },
  {
    name: "Dr. Neha Sharma",
    fields: ["Gynecology", "Obstetrics"],
    hospitals: ["City General Hospital", "MetroCare Hospital"],
    experience: "13 years",
    rating: 4.8,
    patients: 2900,
  },
  {
    name: "Dr. Rohan Kulkarni",
    fields: ["ENT", "Head and Neck Surgery"],
    hospitals: ["Sunrise Medical Center", "SWACS Hospital"],
    experience: "12 years",
    rating: 4.8,
    patients: 2100,
  },
  {
    name: "Dr. Aditi Iyer",
    fields: ["Pulmonology", "Critical Care"],
    hospitals: ["Lifeline Multispecialty Hospital", "City General Hospital"],
    experience: "11 years",
    rating: 4.7,
    patients: 2300,
  },
  {
    name: "Dr. Vivek Menon",
    fields: ["Psychiatry", "De-Addiction Medicine"],
    hospitals: ["SWACS Hospital", "Lifeline Multispecialty Hospital"],
    experience: "16 years",
    rating: 4.9,
    patients: 1900,
  },
];
