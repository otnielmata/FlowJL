import { Profile } from "../models/profile.model.js";

class ProfileService {
  async create(data) {
    const profile = await Profile.create(data);
    return profile;
  }

  async update(profileId, data) {
    const profile = await Profile.findByIdAndUpdate(profileId, data, {
      new: true,
      runValidators: true
    });

    if (!profile) {
      throw {
        statusCode: 404,
        message: "Profile not found"
      };
    }

    return profile;
  }

  async list() {
    const profiles = await Profile.find().sort({ createdAt: -1 });
    return profiles;
  }
}

export const profileService = new ProfileService();
