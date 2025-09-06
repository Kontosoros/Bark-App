from django.urls import path
from .views import CreateUserView, RegisterView, AnalyzeAudioView

urlpatterns = [
    path("ai/analyze/", AnalyzeAudioView.as_view(), name="analyze_audio"),
    
]
