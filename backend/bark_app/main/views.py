from django.shortcuts import render
from rest_framework import generics
from django.contrib.auth.models import User
from .serializers import UserSerializer, RegisterSerializer
from rest_framework.permissions import AllowAny


# Create your views here.
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
