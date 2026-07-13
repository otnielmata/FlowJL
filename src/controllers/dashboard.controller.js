import { z } from "zod";

import { dashboardService } from "../services/dashboard.service.js";

const querySchema = z.object({
  launchId: z.string().uuid().optional()
});
const searchQuerySchema = z.object({
  q: z.string().trim().min(2)
});
const notificationParamsSchema = z.object({
  notificationId: z.string().trim().min(1)
});

class DashboardController {
  async getOverview(request, response) {
    const dashboard = await dashboardService.getOverview({
      currentUser: request.currentUser,
      currentRole: request.currentRole
    });

    response.status(200).json(dashboard);
  }

  async getStrategistDashboard(request, response) {
    const filters = querySchema.parse(request.query);
    const dashboard = await dashboardService.getStrategistDashboard(filters);

    response.status(200).json(dashboard);
  }

  async listNotifications(request, response) {
    const notifications = await dashboardService.listNotifications({
      currentUser: request.currentUser,
      currentRole: request.currentRole
    });

    response.status(200).json({
      items: notifications,
      unreadCount: notifications.filter((notification) => !notification.readAt).length
    });
  }

  async markNotificationAsRead(request, response) {
    const { notificationId } = notificationParamsSchema.parse(request.params);
    const notification = await dashboardService.markNotificationAsRead({
      currentUser: request.currentUser,
      currentRole: request.currentRole,
      notificationId
    });

    response.status(200).json(notification);
  }

  async markAllNotificationsAsRead(request, response) {
    const result = await dashboardService.markAllNotificationsAsRead({
      currentUser: request.currentUser,
      currentRole: request.currentRole
    });

    response.status(200).json(result);
  }

  async search(request, response) {
    const { q } = searchQuerySchema.parse(request.query);
    const result = await dashboardService.search({
      currentRole: request.currentRole,
      query: q
    });

    response.status(200).json(result);
  }
}

export const dashboardController = new DashboardController();
