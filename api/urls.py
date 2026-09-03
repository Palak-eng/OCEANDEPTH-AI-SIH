from django.urls import path

from . import views

urlpatterns = [
    path("", views.api_index, name="api-index"),
    path("health/", views.health_check, name="health-check"),
    path("auth/csrf/", views.csrf_token, name="csrf-token"),
    path("auth/send-email-otp/", views.send_email_otp, name="send-email-otp"),
    path("auth/verify-email-otp/", views.verify_email_otp, name="verify-email-otp"),
    path("auth/signup/", views.signup, name="signup"),
    path("auth/login/", views.login_user, name="login"),
    path("auth/forgot-username/", views.forgot_username, name="forgot-username"),
    path("auth/forgot-password/", views.forgot_password, name="forgot-password"),
    path("auth/logout/", views.logout_user, name="logout"),
    path("auth/me/", views.current_user, name="current-user"),
    path("model/status/", views.model_status, name="model-status"),
    path("datasets/", views.datasets, name="datasets"),
    path("predict/", views.predict_temperature, name="predict-temperature"),
]
