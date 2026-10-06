from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsOwner

from .serializers import BusinessSerializer


class BusinessView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]

        return [IsOwner()]

    def get(self, request):
        return Response(BusinessSerializer(request.user.business).data)

    def patch(self, request):
        serializer = BusinessSerializer(
            request.user.business,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)
