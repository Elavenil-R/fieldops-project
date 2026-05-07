from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app import models, schemas


router = APIRouter(
    tags=["Jobs"]
)


@router.post("/jobs/", status_code=status.HTTP_200_OK)
def create_job(job: schemas.JobCreate, db: Session = Depends(get_db)):
    """
    Create a new job.

    New jobs are created with:
    status = active
    is_deleted = False
    """

    try:
        new_job = models.Job(
            customer_name=job.customer_name,
            location=job.location,
            issue=job.issue,
            priority=job.priority,
            status="active",
            is_deleted=False
        )

        db.add(new_job)
        db.commit()
        db.refresh(new_job)

        return {
            "message": "Job created successfully",
            "job_id": new_job.id,
            "job": {
                "id": new_job.id,
                "customer_name": new_job.customer_name,
                "location": new_job.location,
                "issue": new_job.issue,
                "priority": new_job.priority,
                "status": new_job.status,
                "is_deleted": new_job.is_deleted,
                "created_at": new_job.created_at,
                "updated_at": new_job.updated_at,
            },
        }

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while creating job"
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred"
        )


@router.get("/jobs/")
def get_all_jobs(db: Session = Depends(get_db)):
    """
    Fetch only active dashboard jobs.

    This hides:
    - cancelled jobs
    - soft deleted jobs
    """

    try:
        jobs = (
            db.query(models.Job)
            .filter(
                models.Job.is_deleted == False,
                models.Job.status == "active"
            )
            .order_by(models.Job.id.desc())
            .all()
        )

        return {
            "message": "Active jobs fetched successfully",
            "count": len(jobs),
            "jobs": jobs,
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while fetching jobs"
        )


@router.get("/jobs/{job_id}")
def get_job_by_id(job_id: int, db: Session = Depends(get_db)):
    """
    Fetch one job by ID.

    Deleted jobs will not be returned.
    """

    try:
        job = (
            db.query(models.Job)
            .filter(
                models.Job.id == job_id,
                models.Job.is_deleted == False
            )
            .first()
        )

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )

        return {
            "message": "Job fetched successfully",
            "job": {
                "id": job.id,
                "customer_name": job.customer_name,
                "location": job.location,
                "issue": job.issue,
                "priority": job.priority,
                "status": job.status,
                "is_deleted": job.is_deleted,
                "created_at": job.created_at,
                "updated_at": job.updated_at,
            },
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while fetching job"
        )


@router.put("/jobs/{job_id}")
def update_job(
    job_id: int,
    job_data: schemas.JobUpdate,
    db: Session = Depends(get_db)
):
    """
    Update job details.

    This updates only job details:
    - customer_name
    - location
    - issue
    - priority

    It does not update status.
    """

    try:
        job = (
            db.query(models.Job)
            .filter(
                models.Job.id == job_id,
                models.Job.is_deleted == False
            )
            .first()
        )

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )

        job.customer_name = job_data.customer_name
        job.location = job_data.location
        job.issue = job_data.issue
        job.priority = job_data.priority

        db.commit()
        db.refresh(job)

        return {
            "message": "Job updated successfully",
            "job_id": job.id,
            "job": {
                "id": job.id,
                "customer_name": job.customer_name,
                "location": job.location,
                "issue": job.issue,
                "priority": job.priority,
                "status": job.status,
                "is_deleted": job.is_deleted,
                "created_at": job.created_at,
                "updated_at": job.updated_at,
            },
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while updating job"
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while updating job"
        )


@router.put("/jobs/{job_id}/cancel")
def cancel_job(job_id: int, db: Session = Depends(get_db)):
    """
    Cancel selected job.

    This updates status to cancelled in PostgreSQL.
    It does not permanently delete the job.
    Cancelled jobs will not show in GET /jobs/.
    """

    try:
        job = (
            db.query(models.Job)
            .filter(
                models.Job.id == job_id,
                models.Job.is_deleted == False
            )
            .first()
        )

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )

        if job.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job is already cancelled"
            )

        job.status = "cancelled"

        db.commit()
        db.refresh(job)

        return {
            "message": "Job cancelled successfully",
            "job_id": job.id,
            "job": {
                "id": job.id,
                "customer_name": job.customer_name,
                "location": job.location,
                "issue": job.issue,
                "priority": job.priority,
                "status": job.status,
                "is_deleted": job.is_deleted,
                "created_at": job.created_at,
                "updated_at": job.updated_at,
            },
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while cancelling job"
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while cancelling job"
        )


@router.delete("/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    """
    Soft delete selected job.

    This does not permanently delete the job from PostgreSQL.
    It only changes is_deleted from False to True.
    Deleted jobs will not show in GET /jobs/.
    """

    try:
        job = (
            db.query(models.Job)
            .filter(
                models.Job.id == job_id,
                models.Job.is_deleted == False
            )
            .first()
        )

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )

        job.is_deleted = True

        db.commit()
        db.refresh(job)

        return {
            "message": "Job removed from active dashboard successfully",
            "deleted_job_id": job.id,
            "job": {
                "id": job.id,
                "customer_name": job.customer_name,
                "location": job.location,
                "issue": job.issue,
                "priority": job.priority,
                "status": job.status,
                "is_deleted": job.is_deleted,
                "created_at": job.created_at,
                "updated_at": job.updated_at,
            },
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while deleting job"
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while deleting job"
        )