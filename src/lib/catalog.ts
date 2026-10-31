// Suggestion lists for pickers. Users can always type their own values.

export const LANGUAGES = ["TypeScript", "JavaScript", "Python", "Rust", "Go", "Java", "C++", "C", "Swift", "Kotlin", "Ruby", "C#", "Dart", "SQL", "Elixir", "Haskell", "Solidity", "Zig", "R", "Julia"];

export const TECHNOLOGIES = ["React", "Next.js", "Vue", "Svelte", "Node.js", "Django", "FastAPI", "Flask", "Rails", "Spring", "PostgreSQL", "MongoDB", "Redis", "Supabase", "Firebase", "Prisma", "GraphQL", "Docker", "Kubernetes", "AWS", "GCP", "Vercel", "Tailwind CSS", "PyTorch", "TensorFlow", "LangChain", "Hugging Face", "OpenCV", "React Native", "Flutter", "SwiftUI", "Unity", "Three.js", "Figma", "Arduino", "Raspberry Pi"];

export const INTERESTS = ["AI / ML", "Developer Tools", "Open Source", "Health Tech", "Climate", "Fintech", "Web3", "EdTech", "Games", "Hardware", "Robotics", "Security", "Data Science", "Design", "Social Impact", "Startups", "AR / VR", "Music Tech"];

export const PROJECT_TYPES = ["Web", "Mobile", "AI / ML", "Dev Tools", "Games", "Hardware", "Data", "Web3", "Research", "Open Source"];

export const AVAILABILITY = ["Weekends", "Evenings", "Full-time this month", "A few hours/week", "Hackathons only"];

export const CATEGORIES = ["Web", "Mobile", "AI / ML", "Dev Tools", "Games", "Hardware", "Data", "Web3", "Social Impact"];

/** Small built-in gazetteer for picking a location without a geocoding API key. */
export const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Austin, TX", lat: 30.2672, lng: -97.7431 },
  { name: "San Francisco, CA", lat: 37.7749, lng: -122.4194 },
  { name: "Berkeley, CA", lat: 37.8715, lng: -122.273 },
  { name: "Palo Alto, CA", lat: 37.4419, lng: -122.143 },
  { name: "Los Angeles, CA", lat: 34.0522, lng: -118.2437 },
  { name: "San Diego, CA", lat: 32.7157, lng: -117.1611 },
  { name: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
  { name: "Portland, OR", lat: 45.5152, lng: -122.6784 },
  { name: "Denver, CO", lat: 39.7392, lng: -104.9903 },
  { name: "Dallas, TX", lat: 32.7767, lng: -96.797 },
  { name: "Houston, TX", lat: 29.7604, lng: -95.3698 },
  { name: "College Station, TX", lat: 30.628, lng: -96.3344 },
  { name: "Chicago, IL", lat: 41.8781, lng: -87.6298 },
  { name: "Champaign, IL", lat: 40.1164, lng: -88.2434 },
  { name: "Ann Arbor, MI", lat: 42.2808, lng: -83.743 },
  { name: "Pittsburgh, PA", lat: 40.4406, lng: -79.9959 },
  { name: "Philadelphia, PA", lat: 39.9526, lng: -75.1652 },
  { name: "New York, NY", lat: 40.7128, lng: -74.006 },
  { name: "Boston, MA", lat: 42.3601, lng: -71.0589 },
  { name: "Cambridge, MA", lat: 42.3736, lng: -71.1097 },
  { name: "Atlanta, GA", lat: 33.749, lng: -84.388 },
  { name: "Miami, FL", lat: 25.7617, lng: -80.1918 },
  { name: "Washington, DC", lat: 38.9072, lng: -77.0369 },
  { name: "Toronto, ON", lat: 43.6532, lng: -79.3832 },
  { name: "Waterloo, ON", lat: 43.4643, lng: -80.5204 },
  { name: "Vancouver, BC", lat: 49.2827, lng: -123.1207 },
  { name: "London, UK", lat: 51.5074, lng: -0.1278 },
  { name: "Berlin, DE", lat: 52.52, lng: 13.405 },
  { name: "Paris, FR", lat: 48.8566, lng: 2.3522 },
  { name: "Amsterdam, NL", lat: 52.3676, lng: 4.9041 },
  { name: "Zurich, CH", lat: 47.3769, lng: 8.5417 },
  { name: "Bangalore, IN", lat: 12.9716, lng: 77.5946 },
  { name: "Chennai, IN", lat: 13.0827, lng: 80.2707 },
  { name: "Mumbai, IN", lat: 19.076, lng: 72.8777 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Tokyo, JP", lat: 35.6762, lng: 139.6503 },
  { name: "Seoul, KR", lat: 37.5665, lng: 126.978 },
  { name: "Sydney, AU", lat: -33.8688, lng: 151.2093 },
  { name: "Lagos, NG", lat: 6.5244, lng: 3.3792 },
  { name: "São Paulo, BR", lat: -23.5505, lng: -46.6333 },
];
