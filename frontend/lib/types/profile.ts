export interface HealthProfile {
  id?: string;
  user_id?: string;
  full_name?: string;
  age?: number;
  gender?: 'male' | 'female' | 'non-binary' | 'prefer_not_to_say';
  blood_type?: string;
  conditions: string[];
  medications: string[];
  allergies: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface UserSettings {
  model: string;
  personality: 'clinical' | 'friendly' | 'concise';
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  tool_assess_symptoms: boolean;
  tool_drug_interactions: boolean;
  tool_medical_knowledge: boolean;
  tool_find_care_level: boolean;
  tool_update_health_profile: boolean;
}
